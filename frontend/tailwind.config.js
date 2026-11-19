/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#101B35',
          'navy-dark': '#0A1224',
          'navy-light': '#1A294C',
          blue: '#356AE6',
          'blue-hover': '#2954BD',
          'blue-light': '#EDF2FE',
          bg: '#F5F7FB',
          surface: '#FFFFFF',
          text: '#172033',
          'text-secondary': '#718096',
          border: '#E5EAF2',
          success: '#16A36A',
          'success-light': '#E8F8F0',
          warning: '#E9A23B',
          'warning-light': '#FEF6E9',
          danger: '#DC5353',
          'danger-light': '#FDF1F1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(16, 27, 53, 0.05), 0 1px 2px -1px rgba(16, 27, 53, 0.05)',
        'card': '0 4px 6px -1px rgba(16, 27, 53, 0.04), 0 2px 4px -2px rgba(16, 27, 53, 0.04)',
        'modal': '0 20px 25px -5px rgba(16, 27, 53, 0.1), 0 8px 10px -6px rgba(16, 27, 53, 0.1)',
        'dropdown': '0 10px 15px -3px rgba(16, 27, 53, 0.08), 0 4px 6px -4px rgba(16, 27, 53, 0.04)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
}
