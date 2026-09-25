import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  clearChatHistory,
  getRecentChatMessages,
  saveChatMessage,
  subscribeToChatMessages,
  subscribeToDoshaResult,
  subscribeToGoals,
  subscribeToMealPlanWeek,
  subscribeToOnboarding,
} from "@/services/firestoreService";
import { callAIChat } from "@/utils/aiApi";
import { buildChatPrompt, buildQuickReplyPrompt } from "@/utils/prompts";
import { getTodayIndex, getWeekStartDate } from "@/utils/weekUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
}

const globalSendLock = { current: false };

export default function ChatScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const isSendingRef = useRef(false);
  const [userContext, setUserContext] = useState<UserContext>({});
  
  const [quickReplies, setQuickReplies] = useState<string[]>([
    "What should I eat today?",
    "Suggest a healthy recipe",
    "How to improve digestion?",
    "Tips for better sleep",
  ]);

  const processedMessageIds = useRef<Set<string>>(new Set());

  // Load user context and chat history
  useEffect(() => {
    if (!user?.uid) return;

    const unsubDosha = subscribeToDoshaResult(user.uid, (data) => {
      setUserContext((prev) => ({
        ...prev,
        doshaType: data?.doshaType,
        doshaAnalysis: data?.aiAnalysis,
      }));
    });

    const unsubGoals = subscribeToGoals(user.uid, (data) => {
      setUserContext((prev) => ({
        ...prev,
        goals: data?.selectedGoals || [],
      }));
    });

    const unsubOnboarding = subscribeToOnboarding(user.uid, (data) => {
      if (data) {
        setUserContext((prev) => ({
          ...prev,
          diet: data.diet,
          region: data.region,
        }));
      }
    });

    const weekStart = getWeekStartDate();
    const unsubMealPlan = subscribeToMealPlanWeek(user.uid, weekStart, (data) => {
      if (data?.weekPlan && data.weekPlan.days) {
        const todayIdx = getTodayIndex();
        const todayMeals = data.weekPlan.days[todayIdx]?.meals || [];
        setUserContext((prev) => ({ ...prev, todayMeals }));
      }
    });

    // Load chat messages
    const loadMessages = async () => {
      const msgs = await getRecentChatMessages(user.uid, 50);
      if (msgs.length === 0) {
        const welcomeMsg: Message = {
          id: `welcome_${Date.now()}`,
          role: "assistant",
          content: getWelcomeMessage(userContext.doshaType),
        };
        await saveChatMessage(user.uid, welcomeMsg);
        setMessages([welcomeMsg]);
      } else {
        setMessages(msgs);
      }
    };
    loadMessages();

    // Subscribe to new messages (optional: we handle it manually on send to avoid double rendering)
    const unsubMessages = subscribeToChatMessages(user.uid, (msgs) => {
      if (msgs.length > 0) {
        setMessages(msgs);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    return () => {
      unsubDosha();
      unsubGoals();
      unsubOnboarding();
      unsubMealPlan();
      unsubMessages();
    };
  }, [user?.uid]);

  // Handle Android keyboard manually since native adjustResize is failing on some devices
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setAndroidKeyboardHeight(e.endCoordinates.height);
    });
    
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const getWelcomeMessage = (doshaType?: string) => {
    if (doshaType && doshaType !== "Discover") {
      return `Namaste! 🙏 I'm Vaidya AI, your personal Ayurvedic wellness companion. I see you have a ${doshaType} constitution. How can I help you today?`;
    }
    return `Namaste! 🙏 I'm Vaidya AI, your personal Ayurvedic wellness companion. I can help you with personalized diet advice, recipes, and wellness tips. Have you taken your Dosha assessment yet?`;
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !user?.uid) return;
      if (isSendingRef.current || globalSendLock.current) return;

      isSendingRef.current = true;
      globalSendLock.current = true;
      setIsLoading(true);
      setInputText("");
      Keyboard.dismiss();

      const userMessageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (processedMessageIds.current.has(userMessageId)) {
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
        await saveChatMessage(user.uid, userMessage);
        
        const prompt = buildChatPrompt(text.trim(), messages, userContext);
        const responseText = await callAIChat(prompt, 1500);

        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: responseText,
        };

        await saveChatMessage(user.uid, assistantMessage);
      } catch (err: any) {
        const errorMessage: Message = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment. 🙏",
        };
        await saveChatMessage(user.uid, errorMessage);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          isSendingRef.current = false;
          globalSendLock.current = false;
        }, 1000);
      }
    },
    [user?.uid, userContext, messages]
  );

  const handleClearChat = async () => {
    if (!user?.uid) return;
    Alert.alert(
      "Clear Chat",
      "Are you sure you want to clear your conversation history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive",
          onPress: async () => {
            await clearChatHistory(user.uid);
            const welcomeMsg: Message = {
              id: Date.now().toString(),
              role: "assistant",
              content: getWelcomeMessage(userContext.doshaType),
            };
            setMessages([welcomeMsg]);
            await saveChatMessage(user.uid, welcomeMsg);
          }
        }
      ]
    );
  };

  const renderMessageContent = (text: string) => {
    // Basic text rendering (markdown could be added later if needed)
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
  };

  const renderItem = ({ item, index }: { item: Message, index: number }) => {
    const isUser = item.role === "user";
    const showAvatar = index === 0 || messages[index - 1]?.role !== item.role;

    return (
      <View style={[st.messageWrapper, isUser ? st.messageWrapperUser : st.messageWrapperBot]}>
        {!isUser && showAvatar ? (
          <View style={[st.avatar, { backgroundColor: colors.gold }]}>
             <Ionicons name="sparkles" size={16} color={colors.green} />
          </View>
        ) : (
          !isUser && <View style={st.avatarPlaceholder} />
        )}

        <View
          style={[
            st.messageBubble,
            isUser ? [st.userBubble, { backgroundColor: colors.green }] : [st.botBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }],
          ]}
        >
          <Text style={[st.messageText, { color: isUser ? "#FFF" : colors.text }]}>
            {renderMessageContent(item.content)}
          </Text>
        </View>
      </View>
    );
  };

  const { width, height: windowHeight } = useWindowDimensions();
  const isDesktop = width > 768 && Platform.OS === 'web';

  // Desktop Widget Wrapper
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end', alignItems: 'flex-end', padding: 24 }}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => router.back()} />
        <View style={{ width: 360, height: 550, maxHeight: windowHeight - 48, backgroundColor: colors.background, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 }}>
          <View style={[st.container, { flex: 1, backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[st.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder, paddingTop: 12, paddingBottom: 12 }]}>
              <View style={st.headerTitleContainer}>
                <View style={[st.headerIcon, { backgroundColor: `${colors.gold}20`, width: 32, height: 32, borderRadius: 10 }]}>
                  <Text style={{ fontSize: 14 }}>🌿</Text>
                </View>
                <View>
                  <Text style={[st.headerTitle, { color: colors.text, fontSize: 15 }]}>Vaidya AI</Text>
                  <Text style={[st.headerSubtitle, { color: colors.textMuted, fontSize: 11 }]}>Your Ayurvedic companion</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={handleClearChat} style={st.clearBtn}>
                  <Ionicons name="trash-outline" size={20} color={colors.errorText || "#FF3B30"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()} style={st.clearBtn}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <KeyboardAvoidingView 
              style={{ flex: 1, paddingBottom: androidKeyboardHeight }} 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {/* Chat Area */}
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={st.chatContainer}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListFooterComponent={
                  isLoading ? (
                    <View style={st.loadingContainer}>
                      <View style={[st.avatar, { backgroundColor: colors.gold }]}>
                        <Ionicons name="sparkles" size={16} color={colors.green} />
                      </View>
                      <View style={[st.loadingBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <ActivityIndicator size="small" color={colors.gold} />
                      </View>
                    </View>
                  ) : null
                }
              />

              {/* Quick Replies */}
              {quickReplies.length > 0 && !isLoading && (
                <View style={[st.quickRepliesContainer, { paddingVertical: 8 }]}>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={quickReplies}
                    keyExtractor={(item, idx) => `qr-${idx}`}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[st.quickReplyBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 }]}
                        onPress={() => sendMessage(item)}
                      >
                        <Text style={[st.quickReplyText, { color: colors.text, fontSize: 12 }]}>{item}</Text>
                      </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 32 }}
                  />
                </View>
              )}

              {/* Input Area */}
              <View style={[st.inputArea, { paddingVertical: 10 }]}>
                <View style={[st.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, paddingLeft: 16, paddingRight: 8, paddingVertical: 4, minHeight: 44 }]}>
                  <TextInput
                    style={[st.input, { color: colors.text, fontSize: 14, paddingTop: 8, paddingBottom: 8, minHeight: 28, maxHeight: 100 }]}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Message Vaidya AI..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    onPress={() => sendMessage(inputText)}
                    disabled={isLoading || !inputText.trim()}
                    style={[
                      st.sendBtn,
                      { backgroundColor: inputText.trim() ? colors.green : 'transparent', width: 34, height: 34, borderRadius: 17, marginLeft: 8 },
                    ]}
                  >
                    <Ionicons name="send" size={14} color={inputText.trim() ? "#FFF" : colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </View>
    );
  }

  // Mobile Render
  return (
    <View style={[st.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[st.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={st.headerTitleContainer}>
          <View style={[st.headerIcon, { backgroundColor: `${colors.gold}20` }]}>
            <Text style={{ fontSize: 18 }}>🌿</Text>
          </View>
          <View>
            <Text style={[st.headerTitle, { color: colors.text }]}>Vaidya AI</Text>
            <Text style={[st.headerSubtitle, { color: colors.textMuted }]}>Your Ayurvedic companion</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleClearChat} style={st.clearBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.errorText || "#FF3B30"} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1, paddingBottom: androidKeyboardHeight }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Chat Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={st.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            isLoading ? (
              <View style={st.loadingContainer}>
                <View style={[st.avatar, { backgroundColor: colors.gold }]}>
                  <Ionicons name="sparkles" size={16} color={colors.green} />
                </View>
                <View style={[st.loadingBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <ActivityIndicator size="small" color={colors.gold} />
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick Replies */}
        {quickReplies.length > 0 && !isLoading && (
          <View style={[st.quickRepliesContainer, { paddingVertical: 8 }]}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={quickReplies}
              keyExtractor={(item, idx) => `qr-${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[st.quickReplyBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 }]}
                  onPress={() => sendMessage(item)}
                >
                  <Text style={[st.quickReplyText, { color: colors.text, fontSize: 12 }]}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 32 }}
            />
          </View>
        )}

        {/* Input Area */}
        <View style={[st.inputArea, { paddingVertical: 10 }]}>
          <View style={[st.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, paddingLeft: 16, paddingRight: 8, paddingVertical: 4, minHeight: 44 }]}>
            <TextInput
              style={[st.input, { color: colors.text, fontSize: 14, paddingTop: 8, paddingBottom: 8, minHeight: 28, maxHeight: 100 }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message Vaidya AI..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              style={[
                st.sendBtn,
                { backgroundColor: inputText.trim() ? colors.green : 'transparent', width: 34, height: 34, borderRadius: 17, marginLeft: 8 },
              ]}
            >
              <Ionicons name="send" size={14} color={inputText.trim() ? "#FFF" : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingHorizontal: 8,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
  },
  clearBtn: {
    padding: 8,
    marginRight: -8,
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  messageWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
    maxWidth: "100%",
  },
  messageWrapperUser: {
    justifyContent: "flex-end",
  },
  messageWrapperBot: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 28,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  loadingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  quickRepliesContainer: {
    paddingVertical: 12,
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
    fontWeight: "500",
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderRadius: 30, // Perfect oval/pill shape
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 38,
    fontSize: 16,
    paddingTop: 10,
    paddingBottom: 10,
    lineHeight: 22,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    marginBottom: 0, // Align exactly with the bottom of the pill
  },
});

