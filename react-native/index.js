/**
 * Entry point. initAppLooma() registers the native WebRTC globals and must run
 * before anything creates an engine.
 */
import { AppRegistry } from 'react-native';
import { initAppLooma } from '@applooma/rtc-react-native';
import App from './App';
import { name as appName } from './app.json';

initAppLooma();
AppRegistry.registerComponent(appName, () => App);
