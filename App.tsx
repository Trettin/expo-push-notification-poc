import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskMngr from 'expo-task-manager';
import * as Device from 'expo-device';
import Constants from "expo-constants";
import { Log } from './services/log';

const ver = '0.0.1'
Log('Version '+ ver, '')
Notifications.registerTaskAsync('BACKGROUND-NOTIFICATION-TASK')
.then(() => {
  
  TaskMngr.isTaskRegisteredAsync('BACKGROUND-NOTIFICATION-TASK')
  .catch((error) => {Log('Error while checking if task is defined',error)})
  .then((isDefined) => {
    Log('isTaskRegisteredAsync?', isDefined)
  })

}).catch((error) => {
  Log('Error while setting Notification Task', error)
})

Log('Setting setNotificationHandler', '')
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
  handleError(notificationId, error) {
    Log('handleError notificationId', {notificationId, error})
  },
  handleSuccess(notificationId) {
    Log('handleSuccess notificationId', notificationId)
  },
});

if (Platform.OS === 'android') {
  Log('IS ANDROID, SETTING CHANNEL ,' , '')
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

export async function registerForPushNotificationsAsync() {
  try {
    let token;
    if (!Device.isDevice) {
      Log('Must use physical device for Push Notifications', '')
      alert('Must use physical device for Push Notifications');
    } 
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    Log('getPermissionsAsync : ', { 
      existingStatus, 
    })

    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    Log('Expo push token and projectId', {
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
      token
    });

    return token;
  } catch (error) {
    Log('Error while registering for pushnotification', error)
  }
  
}

async function sendPushNotification(expoPushToken: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Original Title',
    body: 'And here is the body!',
    data: { someData: 'goes here' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

function useNotificationObserver() {
  Log('useNotificationObserver','')
  React.useEffect(() => {
    let isMounted = true;

    function handleNotificationClick(notification: Notifications.Notification, name: string) {
      // const url = notification.request.content.data?.url;
      // if (url) {
      //   router.push(url);
      alert(`${ver} Notification, Name: ${name}:  ` + JSON.stringify(notification.request.content, null, 2));
      Log('Notification Clicked! ' + name, notification.request.content);
      // }
    }

    Notifications.getLastNotificationResponseAsync() 
      .then(response => {
        Log('getLastNotificationResponseAsync', response);
        if (!isMounted || !response?.notification) {
          alert(`${ver} !isMounted || !response?.notification ` + JSON.stringify({
            isMounted, response
          }, null, 2));
          Log('!isMounted || !response?.notification', {
            isMounted, response
          })

          return;
        }
        handleNotificationClick(response?.notification, 'getLastNotificationResponseAsync');
      });

    Log('setting addNotificationResponseReceivedListener', '')
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationClick(response.notification, 'addNotificationResponseReceivedListener');
    });

    return () => {
      isMounted = false;
      Notifications.removeNotificationSubscription(subscription);
      subscription?.remove();
      Log('useNotificationObserver return','')
    };
  }, []);
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<Notifications.Notification>();
  
  const notificationListener = useRef<Notifications.Subscription | null>();
  const responseListener = useRef<Notifications.Subscription | null>();

  useNotificationObserver();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    Log('Defining addNotificationReceivedListener', '')
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      Log('received notification', {notification});
    });

    // responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
    //   console.log('NOTIFICATION CLICKED> ', JSON.stringify(response.notification.request.content.data, null, 2) )
    // });

    return () => {
      notificationListener.current && Notifications.removeNotificationSubscription(notificationListener.current);
      // responseListener.current && Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <Button title='Teste debug' onPress={() => {
          console.log('testando')
        }} />
      <StatusBar style="auto" />

      <Text>Your expo push token: {expoPushToken}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Version: {ver} </Text>
        <Text>Title: {notification && notification.request.content.title} </Text>
        <Text>Body: {notification && notification.request.content.body}</Text>
        <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
      </View>
      <Button
        title="Press to Send Notification"
        onPress={async () => {
          expoPushToken && await sendPushNotification(expoPushToken);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
