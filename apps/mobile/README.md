# Listen Later mobile (Expo)

Scaffold for React Native + Expo per handoff §8. Not generated in-repo yet to keep CI lean.

```bash
npx create-expo-app@latest . --template blank-typescript
npx expo install expo-speech expo-router react-native-track-player
```

Point the app at `http://127.0.0.1:3333` (or your machine LAN IP) with the bearer token from `POST /v1/auth/login`.
