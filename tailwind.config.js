/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: false,
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        card: 'var(--glass-bg)',
        elevated: 'var(--bg-elevated)',
        input: 'var(--bg-input)',
        subtle: 'var(--border-subtle)',
        default: 'var(--border-default)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        'accent-text': 'var(--accent-text)',
        'ring-track': 'var(--ring-track)',
      },
      boxShadow: {
        card: 'var(--glass-shadow)',
        'card-hover': 'var(--glass-shadow-hover)',
      },
    },
  },
  plugins: [],
};
