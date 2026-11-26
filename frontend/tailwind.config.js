/** @type {import('tailwindcss').Config} */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: token('ground'),
        surface: token('surface'),
        sunken: token('sunken'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        'ink-3': token('ink-3'),
        rail: token('rail'),
        'rail-2': token('rail-2'),
        'rail-ink': token('rail-ink'),
        'rail-ink-2': token('rail-ink-2'),
        ember: token('ember'),
        'ember-hover': token('ember-hover'),
        'ember-soft': token('ember-soft'),
        flag: token('flag'),
        'flag-soft': token('flag-soft'),
        clean: token('clean'),
        'clean-soft': token('clean-soft'),
        pending: token('pending'),
        'pending-soft': token('pending-soft'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
