import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic surface tokens (CSS var mapped) ─────────────────────────
        background:   'var(--background)',
        foreground:   'var(--foreground)',
        card:         'var(--card)',
        muted:        'var(--muted)',
        border:       'var(--border)',
        input:        'var(--input)',
        ring:         'var(--ring)',

        // ── Legacy surface tokens ─────────────────────────────────────────────
        'bg':               'var(--bg)',
        'surface':          'var(--surface)',
        'surface-alt':      'var(--surface-alt)',
        'surface-elevated': 'var(--surface-elevated)',
        'border-strong':    'var(--border-strong)',

        // ── Text hierarchy ────────────────────────────────────────────────────
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        'text-4': 'var(--text-4)',
        'muted-foreground': 'var(--muted-foreground)',

        // ── Brand — emerald green ─────────────────────────────────────────────
        primary: {
          DEFAULT: 'var(--primary)',
          hover:   'var(--primary-hover)',
          subtle:  'var(--primary-subtle)',
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },

        // ── CBG accent tokens ─────────────────────────────────────────────────
        'ember-orange':   'var(--ember-orange)',
        'warm-amber':     'var(--warm-amber)',
        'forest-green':   'var(--forest-green)',
        'night-sky-blue': 'var(--night-sky-blue)',

        // ── Glass surface tokens ──────────────────────────────────────────────
        'glass-overlay':    'var(--glass-overlay)',
        'glass-strong':     'var(--glass-strong)',
        'glass-icon-bg':    'var(--glass-icon-bg)',
        'surface-primary':  'var(--surface-primary-bg)',
        'surface-glass':    'var(--surface-glass-bg)',
        'surface-solid':    'var(--surface-solid-bg)',

        // ── Dashboard tokens ──────────────────────────────────────────────────
        'dash-sidebar-bg':    'var(--dash-sidebar-bg)',
        'dash-header-bg':     'var(--dash-header-bg)',
        'dash-nav-active':    'var(--dash-nav-active-bg)',
        'dash-nav-hover':     'var(--dash-nav-hover-bg)',

        // ── Gold accent (logo) ────────────────────────────────────────────────
        gold: {
          DEFAULT: 'var(--gold)',
          dark:    'var(--gold-dark)',
          light:   'var(--gold-light)',
          subtle:  'var(--gold-subtle)',
        },

        // ── Royal ─────────────────────────────────────────────────────────────
        royal: {
          DEFAULT: 'var(--royal)',
          dark:    'var(--royal-dark)',
        },

        // ── Semantic ──────────────────────────────────────────────────────────
        success: {
          DEFAULT: '#059669',
          bg:      '#ECFDF5',
          text:    '#065f46',
          border:  '#A7F3D0',
        },
        warning: {
          DEFAULT: '#D97706',
          bg:      '#FFFBEB',
          text:    '#92400E',
          border:  '#FDE68A',
        },
        danger: {
          DEFAULT: '#DC2626',
          bg:      '#FEF2F2',
          text:    '#991B1B',
          border:  '#FECACA',
        },
        info: {
          DEFAULT: '#0EA5E9',
          bg:      '#F0F9FF',
          text:    '#075985',
          border:  '#BAE6FD',
        },
      },

      fontFamily: {
        // CBG-style dual-font system
        headline: ['"Crimson Pro"', 'Georgia', 'serif'],
        body:     ['Outfit', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans:     ['Outfit', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },

      fontSize: {
        'xs':  ['0.75rem',   { lineHeight: '1.125rem' }],
        'sm':  ['0.875rem',  { lineHeight: '1.375rem' }],
        'base':['1rem',      { lineHeight: '1.625rem' }],
        'lg':  ['1.125rem',  { lineHeight: '1.75rem'  }],
        'xl':  ['1.25rem',   { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem',    { lineHeight: '2rem'     }],
        '3xl': ['1.875rem',  { lineHeight: '2.375rem' }],
        '4xl': ['2.25rem',   { lineHeight: '2.75rem'  }],
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '68': '17rem',
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
        '96': '24rem',
      },

      boxShadow: {
        // CBG named shadow tokens
        'card':           'var(--shadow-card)',
        'card-prominent': 'var(--shadow-card-prominent)',
        'card-subtle':    'var(--shadow-card-subtle)',
        'card-glass':     'var(--shadow-card-glass)',
        'ember-primary':  'var(--shadow-ember-primary)',
        'hero-panel':     'var(--shadow-hero-panel)',
        'button-primary': 'var(--shadow-light-button-primary)',
        'button-secondary':'var(--shadow-light-button-secondary)',
        // Semantic shadows
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': '0 20px 25px rgba(15, 23, 42, 0.07), 0 8px 10px rgba(15, 23, 42, 0.04)',
      },

      borderRadius: {
        'xs':  '0.25rem',
        'sm':  '0.375rem',
        DEFAULT:'0.5rem',
        'md':  '0.5rem',
        'lg':  '0.75rem',
        'xl':  '1rem',
        '2xl': '1.5rem',
      },

      backdropBlur: {
        'glass': '16px',
        'card':  '8px',
        'heavy': '24px',
      },

      transitionDuration: {
        'button': '500ms',
        'hover':  '300ms',
        'fast':   '150ms',
      },

      animation: {
        'page-in':    'pageIn 160ms ease-out backwards',
        'fade-in':    'fadeIn 240ms ease-out',
        'slide-up':   'slideUp 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'scale-in':   'scaleIn 200ms ease-out',
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      keyframes: {
        pageIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
