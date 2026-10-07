module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['react-native-reanimated/plugin', { globals: ['__scanBarcodes'] }],
    'react-native-vision-camera-frame-processor',
  ],
};