import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, siteUrl } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: appName,
    },
    links: [
      {
        type: 'icon',
        on: 'menu',
        url: siteUrl,
        external: false,
        active: 'none',
        label: '返回 NeoCockpit 官网',
        text: 'NeoCockpit',
        icon: (
          <svg className="nc-sidebar-brand-mark" aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3.2 19.4 7.45v8.1L12 19.8l-7.4-4.25v-8.1L12 3.2Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M7.8 14.6V9.35l8.4 5.3V9.4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="1.15" fill="currentColor" />
          </svg>
        ),
      },
    ],
  };
}
