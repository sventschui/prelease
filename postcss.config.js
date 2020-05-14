const dev = process.env.NODE_ENV !== "production";

module.exports = {
  plugins: [
    require("tailwindcss"),
    ...(dev
      ? []
      : [
          require("cssnano")({
            preset: [
              "default",
              {
                discardUnused: true,
                mergeIdents: true,
                reduceIdents: true,
                zindex: true,
              },
            ],
          }),
          require("autoprefixer"),
        ]),
  ],
};
