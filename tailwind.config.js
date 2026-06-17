/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      // Tokens de los mockups, expuestos como utilidades Tailwind respaldadas
      // por CSS variables (permiten claro/oscuro). Ver src/styles.css.
      colors: {
        surface: {
          DEFAULT: 'var(--color-background-primary)',
          1: 'var(--color-background-primary)',
          2: 'var(--color-background-secondary)',
          3: 'var(--color-background-tertiary)',
          info: 'var(--color-background-info)',
          success: 'var(--color-background-success)',
          warning: 'var(--color-background-warning)',
          danger: 'var(--color-background-danger)',
        },
        ink: {
          DEFAULT: 'var(--color-text-primary)',
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          info: 'var(--color-text-info)',
          success: 'var(--color-text-success)',
          warning: 'var(--color-text-warning)',
          danger: 'var(--color-text-danger)',
        },
        line: {
          DEFAULT: 'var(--color-border-tertiary)',
          tertiary: 'var(--color-border-tertiary)',
          secondary: 'var(--color-border-secondary)',
          primary: 'var(--color-border-primary)',
          info: 'var(--color-border-info)',
          success: 'var(--color-border-success)',
          warning: 'var(--color-border-warning)',
          danger: 'var(--color-border-danger)',
        },
        // Verde cancha: acento de marca para botones primarios.
        pitch: 'var(--color-brand)',
      },
      borderRadius: {
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
        xl: 'var(--border-radius-xl)',
        '2xl': 'var(--border-radius-2xl)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
      },
    },
  },
  plugins: [],
};
