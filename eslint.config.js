import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: [".remember/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react/jsx-no-comment-textnodes": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      // Analytics event names must come from ANALYTICS_EVENTS
      // (src/lib/analytics/events.ts), never raw string literals.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='posthog'][callee.property.name='capture'] > Literal",
          message:
            "Don't pass a raw string to posthog.capture(). Use a constant from ANALYTICS_EVENTS (src/lib/analytics/events.ts).",
        },
      ],
    },
  },
];

export default eslintConfig;
