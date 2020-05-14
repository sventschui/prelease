import prefresh from "@prefresh/vite";
import { parse } from "graphql";

const analyze = Boolean(process.env.ANALYZE);

export default {
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
                  return JSON.stringify(parse(graphql));
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
      ...(analyze ? [require("rollup-plugin-visualizer")()] : []),
    ],
  },
};
