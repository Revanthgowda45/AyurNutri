import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/services/firestoreService";
import { callAIChat } from "@/utils/aiApi";
import { extractAndParseJSON } from "@/utils/parseJSON";
import { buildChatPrompt, buildQuickReplyPrompt } from "@/utils/prompts";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Module-level lock to prevent duplicate sends across component re-renders
const globalSendLock = { current: false };

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: any;
}

interface UserContext {
  doshaType?: string;
  doshaAnalysis?: any;
  goals?: string[];
  diet?: string;
  region?: string;
  todayMeals?: any[];
  checkedMeals?: Record<string, boolean>;
}

export default function ChatBotScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isSendingRef = useRef(false);
  const [userContext, setUserContext] = useState<UserContext>({});
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isGeneratingQuickReplies, setIsGeneratingQuickReplies] = useState(false);
  const hasGeneratedQuickReplies = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load user context and chat history
  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to user data
    const unsubDosha = firestore.subscribeToDoshaResult(user.uid, (data) => {
      setUserContext((prev) => ({
        ...prev,
        doshaType: data?.doshaType,
        doshaAnalysis: data?.aiAnalysis,
      }));
    });

    const unsubGoals = firestore.subscribeToGoals(user.uid, (data) => {
      setUserContext((prev) => ({
        ...prev,
        goals: data?.selectedGoals || [],
      }));
    });

    const unsubOnboarding = firestore.subscribeToOnboarding(user.uid, (data) => {
      if (data) {
        setUserContext((prev) => ({
          ...prev,
          diet: data.diet,
          region: data.region,
        }));
      }
    });

    // Load chat messages and subscribe to real-time updates
    let initialLoadComplete = false;
    
    const loadMessages = async () => {
      const msgs = await firestore.getRecentChatMessages(user.uid, 100);
      if (msgs.length === 0) {
        // Add welcome message only if no messages exist
        const welcomeMsg: Message = {
          id: `welcome_${Date.now()}`,
          role: "assistant",
          content: getWelcomeMessage(userContext.doshaType),
        };
        await firestore.saveChatMessage(user.uid, welcomeMsg);
        setMessages([welcomeMsg]);
      } else {
        setMessages(msgs);
      }
      initialLoadComplete = true;
    };
    loadMessages();

    // Subscribe to real-time updates (only update after initial load)
    const unsubMessages = firestore.subscribeToChatMessages(user.uid, (msgs) => {
      if (initialLoadComplete && msgs.length > 0) {
        setMessages(msgs);
      }
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    return () => {
      unsubDosha();
      unsubGoals();
      unsubOnboarding();
      unsubMessages();
    };
  }, [user?.uid]);

  // Generate quick replies once when context is loaded
  useEffect(() => {
    if (userContext.doshaType && messages.length > 0 && !hasGeneratedQuickReplies.current) {
      hasGeneratedQuickReplies.current = true;
      generateQuickReplies();
    }
  }, [userContext.doshaType]); // Only depend on doshaType, not messages.length

  const getWelcomeMessage = (doshaType?: string) => {
    if (doshaType && doshaType !== "Discover") {
      return `Namaste! 🙏 I'm Vaidya AI, your personal Ayurvedic wellness companion. I see you have a ${doshaType} constitution. How can I help you today?`;
    }
    return `Namaste! 🙏 I'm Vaidya AI, your personal Ayurvedic wellness companion. I can help you with personalized diet advice, recipes, and wellness tips. Have you taken your Dosha assessment yet?`;
  };

  const generateQuickReplies = async () => {
    // Multiple guards to prevent duplicate calls
    if (isGeneratingQuickReplies || quickReplies.length > 0) {
      console.log("[ChatBot] Skipping quick replies generation - already generated or in progress");
      return;
    }
    setIsGeneratingQuickReplies(true);

    try {
      const prompt = buildQuickReplyPrompt(userContext);
      const response = await callAIChat(prompt, 500);
      // Try to parse JSON, but fallback if it fails
      let replies: string[] = [];
      try {
        replies = extractAndParseJSON<string[]>(response);
      } catch {
        // If JSON parsing fails, try to extract array-like content
        const match = response.match(/\[([\s\S]*)\]/);
        if (match) {
          try {
            replies = JSON.parse(match[0]);
          } catch {
            // Split by newlines or quotes as last resort
            replies = response
              .split(/\n|","/)
              .map(s => s.replace(/^[\s"\[]+|[\s"\]]+$/g, ''))
              .filter(s => s.length > 0 && s.length < 50);
          }
        }
      }
      if (replies.length > 0) {
        setQuickReplies(replies.slice(0, 4));
      } else {
        throw new Error("No valid quick replies generated");
      }
    } catch (err) {
      // Fallback quick replies
      setQuickReplies([
        "What should I eat today?",
        "Suggest a healthy recipe",
        "How to improve digestion?",
        "Tips for better sleep",
      ]);
    } finally {
      setIsGeneratingQuickReplies(false);
    }
  };

  // Use a ref to track processed message IDs to prevent duplicates
  const processedMessageIds = useRef<Set<string>>(new Set());

  const sendMessage = useCallback(
    async (text: string) => {
      // Multiple layers of protection against duplicate sends
      if (!text.trim() || !user?.uid) {
        console.log("[ChatBot] Blocked - invalid input");
        return;
      }
      
      // Check both component-level and module-level locks
      if (isSendingRef.current || globalSendLock.current) {
        console.log("[ChatBot] Blocked - already sending (lock active)");
        return;
      }
      
      // Set both locks immediately
      isSendingRef.current = true;
      globalSendLock.current = true;
      setIsLoading(true);
      setInputText("");
      
      // Generate unique ID for this message
      const userMessageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if we already processed this message
      if (processedMessageIds.current.has(userMessageId)) {
        console.log("[ChatBot] Blocked - duplicate message ID");
        globalSendLock.current = false;
        return;
      }
      
      processedMessageIds.current.add(userMessageId);

      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: text.trim(),
      };

      try {
        console.log("[ChatBot] Sending message:", text.trim());
        
        // Save user message to Firestore (subscription will update UI)
        await firestore.saveChatMessage(user.uid, userMessage);

        // Get latest messages from Firestore for accurate context
        const recentMessages = await firestore.getRecentChatMessages(user.uid, 20);
        const prompt = buildChatPrompt(
          text.trim(),
          recentMessages.map((m) => ({ role: m.role, content: m.content })),
          userContext
        );

        // Call AI (chat mode - no JSON validation)
        console.log("[ChatBot] Calling AI...");
        const response = await callAIChat(prompt, 2000);
        console.log("[ChatBot] AI response received");

        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: response.trim(),
        };

        // Save AI response to Firestore (subscription will update UI)
        await firestore.saveChatMessage(user.uid, assistantMessage);

        // Generate new quick replies based on context (reset the guard first)
        setTimeout(() => {
          hasGeneratedQuickReplies.current = false;
          generateQuickReplies();
        }, 500);
      } catch (err: any) {
        console.error("[ChatBot] AI Error:", err);
        const errorMessage: Message = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment. 🙏",
        };
        await firestore.saveChatMessage(user.uid, errorMessage);
      } finally {
        setIsLoading(false);
        // Delay resetting both locks to prevent rapid double-clicks
        setTimeout(() => {
          isSendingRef.current = false;
          globalSendLock.current = false;
          console.log("[ChatBot] Locks released");
        }, 1000);
      }
    },
    [user?.uid, userContext]
  );

  const clearChat = () => {
    const welcomeMsg: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: getWelcomeMessage(userContext.doshaType),
    };

    const doReset = async () => {
      // Clear UI immediately (optimistic update)
      setMessages([welcomeMsg]);
      if (!user?.uid) return;
      try {
        await firestore.clearChatHistory(user.uid);
        await firestore.saveChatMessage(user.uid, welcomeMsg);
      } catch (err) {
        console.warn("[Chat] Could not clear history from Firestore:", err);
      }
    };

    Alert.alert(
      "Clear Chat",
      "Are you sure you want to clear all messages?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: doReset },
      ]
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === "user";
    const showAvatar = index === 0 || messages[index - 1]?.role !== item.role;

    return (
      <View
        style={[
          s.messageRow,
          isUser ? s.messageRowUser : s.messageRowAssistant,
        ]}
      >
        {!isUser && showAvatar && (
          <View style={[s.avatar, { backgroundColor: colors.gold }]}>
            <Text style={s.avatarText}>🧘</Text>
          </View>
        )}
        {!isUser && !showAvatar && <View style={s.avatarPlaceholder} />}

        <View
          style={[
            s.messageBubble,
            isUser
              ? [s.messageBubbleUser, { backgroundColor: colors.green }]
              : [s.messageBubbleAssistant, { backgroundColor: colors.card, borderColor: colors.cardBorder }],
          ]}
        >
          <Text
            style={[
              s.messageText,
              isUser ? { color: "#fff" } : { color: colors.text },
            ]}
          >
            {item.content}
          </Text>
        </View>

        {isUser && showAvatar && (
          <View style={[s.avatar, { backgroundColor: colors.surface }]}>
            <Text style={s.avatarText}>🙋</Text>
          </View>
        )}
        {isUser && !showAvatar && <View style={s.avatarPlaceholder} />}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.headerBg, paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.textOnHeader} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <View style={[s.botIcon, { backgroundColor: colors.gold }]}>
            <Text style={s.botIconText}>🌿</Text>
          </View>
          <View>
            <Text style={[s.headerTitle, { color: colors.textOnHeader }]}>
              Vaidya AI
            </Text>
            <Text style={[s.headerSubtitle, { color: colors.textOnHeaderSub }]}>
              {t('chat_subtitle')}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={clearChat} style={s.clearBtn}>
          <Ionicons name="trash-outline" size={22} color={colors.textOnHeader} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <Animated.View style={[s.messagesContainer, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        {isLoading && (
          <View style={[s.typingIndicator, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="small" color={colors.gold} />
            <Text style={[s.typingText, { color: colors.textMuted }]}>
              {t('chat_typing')}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Quick Replies */}
      {quickReplies.length > 0 && !isLoading && (
        <View style={[s.quickRepliesContainer, { backgroundColor: colors.background }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.quickRepliesList}
          >
            {quickReplies.map((reply, index) => (
              <TouchableOpacity
                key={index}
                style={[s.quickReplyBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                onPress={() => sendMessage(reply)}
              >
                <Text style={[s.quickReplyText, { color: colors.text }]} numberOfLines={1}>
                  {reply}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input */}
      <View style={[s.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
        <TextInput
          style={[
            s.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.cardBorder,
            },
          ]}
          placeholder={t('chat_placeholder')}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (!isLoading && inputText.trim()) {
              sendMessage(inputText);
            }
          }}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            s.sendBtn,
            { backgroundColor: inputText.trim() && !isLoading ? colors.gold : colors.divider },
          ]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() ? "#1B4332" : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  botIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  botIconText: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  clearBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  avatarText: {
    fontSize: 16,
  },
  avatarPlaceholder: {
    width: 40,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  messageBubbleUser: {
    borderBottomRightRadius: 4,
  },
  messageBubbleAssistant: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: 56,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    fontWeight: "500",
  },
  quickRepliesContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  quickRepliesList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickReplyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});

