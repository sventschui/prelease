throw new Error('ee');

module.exports = {
    // presets: ["@babel/preset-env", ["@babel/preset-react", {
    //     pragma: "h",
    //     pragmaFrag: "Fragment",
    // }]],
    plugins: [
        'babel-plugin-graphql-tag'
    ]
}