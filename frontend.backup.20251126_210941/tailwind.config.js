/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    blue: '#2563eb', // Primary Blue (Tailwind Blue 600)
                    dark: '#0f172a', // Slate 900
                    darker: '#020617', // Slate 950
                    light: '#f1f5f9', // Slate 100
                }
            }
        },
    },
    plugins: [],
}
