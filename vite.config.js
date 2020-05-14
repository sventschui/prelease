import prefresh from '@prefresh/vite';

const analyze = Boolean(process.env.ANALYZE);

export default {
    plugins: [prefresh()],
    rollupInputOptions: {
        plugins: [
            require('@rollup/plugin-replace')({
                'process.env.NODE_ENV': '"production"',
                '__DEV__': 'false',
            }),
            ...(analyze ? [
                require('rollup-plugin-visualizer')(),
            ] : []),
        ]
    }
};
