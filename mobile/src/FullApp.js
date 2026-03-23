import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet, View } from 'react-native'
import { AuthProvider } from './context/AuthContext'
import AppNavigator from './navigation/AppNavigator'
import NotificationManager from './components/NotificationManager'

export default function FullApp() {
  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <NotificationManager />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
})
