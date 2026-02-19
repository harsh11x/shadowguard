/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#0d59f2",
                "background-light": "#f5f6f8",
                "background-dark": "#0a0a0a",
                "surface-dark": "#111111",
                "border-dark": "#333333",
                "accent-blue": "#0d59f2",
            },
            fontFamily: {
                "display": ["Space Grotesk", "sans-serif"],
                "mono": ["JetBrains Mono", "monospace"],
            },
            borderRadius: {
                "DEFAULT": "0px",
                "sm": "2px",
                "md": "4px",
                "lg": "0px",
                "xl": "0px",
                "full": "9999px"
            },
        },
    },
    plugins: [],
}
