import prefresh from "@prefresh/vite";
import { parse } from "graphql";
import path from 'path';

const analyze = Boolean(process.env.ANALYZE);

export default {
    alias: {
        // TODO: get rid of relative path...
        'graphql/language/parser': '../../../../graphql-parser-noop.js',
    },
  plugins: [
    prefresh(),
    {
      transforms: [
        {
          test(id) {
            return id.endsWith(".js") || id.endsWith(".jsx");
          },
          transform(code) {
            let tags = [];
            code = code.replace(
              /import\s+([a-z][a-z0-9_]+)\s+from ["']graphql-tag["']/gi,
              (match, tag) => {
                tags.push(tag);
                return "";
              }
            );

            for (const tag of tags) {
              code = code.replace(
                new RegExp(`${tag}\`([^\`]+)\``, "ig"),
                (match, graphql) => {
                  return JSON.stringify(parse(graphql, { noLocation: true }));
                }
              );
            }

            return code;
          },
        },
      ],
    },
  ],
  rollupInputOptions: {
    plugins: [
      require("@rollup/plugin-replace")({
        "process.env.NODE_ENV": '"production"',
        __DEV__: "false",
      }),
      require('@rollup/plugin-alias')({
        entries: [
            { find: 'graphql/language/parser', replacement: '../../../../graphql-parser-noop.js' },
          ]
      }),
      ...(analyze ? [require("rollup-plugin-visualizer")()] : []),
    ],
  },
};
