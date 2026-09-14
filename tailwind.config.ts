import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1a1d21',
          sub: '#5a626b',
          mute: '#8b939c',
        },
        line: {
          DEFAULT: '#d9dde2',
          soft: '#e8ebee',
          hard: '#b9c0c8',
        },
        canvas: '#f4f5f7',
        navy: {
          DEFAULT: '#1b2734',
          hi: '#243444',
          lo: '#141d27',
        },
        accent: {
          DEFAULT: '#17457a',
          hi: '#1d5596',
          lo: '#0f3057',
          soft: '#eaf1f9',
        },
        ok: { DEFAULT: '#1f6b45', soft: '#e7f2ec' },
        warn: { DEFAULT: '#8a5a11', soft: '#fbf1df' },
        ng: { DEFAULT: '#9a3b3b', soft: '#f8ebeb' },
      },
      fontFamily: {
        sans: [
          'Hiragino Kaku Gothic ProN',
          'Hiragino Sans',
          'BIZ UDPGothic',
          'Meiryo',
          'system-ui',
          'sans-serif',
        ],
        num: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '4px',
        lg: '6px',
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs: ['12px', '18px'],
        sm: ['13px', '20px'],
        base: ['14px', '22px'],
        lg: ['16px', '25px'],
        xl: ['19px', '28px'],
        '2xl': ['23px', '32px'],
      },
    },
  },
  plugins: [],
} satisfies Config
