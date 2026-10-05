import type { Config } from 'tailwindcss'

/*
 * 配色の考え方
 * - 介護の現場で毎日使う道具なので、落ち着いた深緑（accent）を主役にし、背景はわずかに温かみのある白
 * - 状態色（ok / warn / ng）は文字でも読めるコントラストを確保
 * - 年配の職員やタブレットでの利用を考え、本文は15px・行間ゆったり・押せる場所は大きく
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1c2522',
          sub: '#55615c',
          mute: '#89938e',
        },
        line: {
          DEFAULT: '#e1e5e2',
          soft: '#eef1ef',
          hard: '#cdd4d0',
        },
        canvas: '#f4f6f4',
        navy: {
          DEFAULT: '#123a34',
          hi: '#1a4a43',
          lo: '#0b2723',
        },
        accent: {
          DEFAULT: '#0f6b60',
          hi: '#0d7e70',
          lo: '#0a5249',
          soft: '#e5f2ef',
          mid: '#bfe0d9',
        },
        sun: { DEFAULT: '#c7841a', soft: '#fdf4e3' },
        ok: { DEFAULT: '#1d7347', soft: '#e6f4ec' },
        warn: { DEFAULT: '#95600a', soft: '#fdf3e1' },
        ng: { DEFAULT: '#b13d36', soft: '#fcecea' },
      },
      fontFamily: {
        sans: [
          'Hiragino Sans',
          'Hiragino Kaku Gothic ProN',
          'Noto Sans JP',
          'BIZ UDPGothic',
          'Yu Gothic UI',
          'Meiryo',
          'system-ui',
          'sans-serif',
        ],
        num: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      fontSize: {
        '2xs': ['11.5px', '16px'],
        xs: ['12.5px', '19px'],
        sm: ['14px', '22px'],
        base: ['15px', '24px'],
        lg: ['17px', '27px'],
        xl: ['20px', '30px'],
        '2xl': ['25px', '35px'],
        '3xl': ['30px', '40px'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 48, 42, 0.04), 0 2px 6px -2px rgba(18, 48, 42, 0.06)',
        lift: '0 2px 4px rgba(18, 48, 42, 0.05), 0 10px 24px -8px rgba(18, 48, 42, 0.14)',
        nav: '0 -1px 0 rgba(18, 48, 42, 0.06), 0 -8px 24px -12px rgba(18, 48, 42, 0.18)',
      },
    },
  },
  plugins: [],
} satisfies Config
