import prefresh from '@prefresh/vite';
 
export default {
    plugins: [prefresh()],
    rollupInputOptions: {
        plugins: [
            require('@rollup/plugin-replace')({
                'process.env.NODE_ENV': '"production"',
                '__DEV__': 'false',
            })
        ]
    }
};
