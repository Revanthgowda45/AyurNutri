/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./context/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: "#f0fdf4",
                    100: "#dcfce7",
                    200: "#bbf7d0",
                    300: "#6ee7b7",
                    400: "#34d399",
                    500: "#1B4332",
                    600: "#163a2b",
                    700: "#0f2c1f",
                    800: "#0a1f15",
                    900: "#05110b",
                },
                gold: {
                    50: "#fefce8",
                    100: "#fef3c7",
                    200: "#fde68a",
                    300: "#fcd34d",
                    400: "#D4A24E",
                    500: "#b8892e",
                    600: "#92631f",
                    700: "#6d4a17",
                },
                cream: "#FDF8F0",
                surface: {
                    DEFAULT: "#f7f3ed",
                    card: "#FFFFFF",
                    muted: "#F3EFE7",
                },
            },
        },
    },
    plugins: [],
};
