

import { useState, useEffect } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { View, SplitLayout, SplitCol, ConfigProvider, AdaptivityProvider } from '@vkontakte/vkui';
import { useAppearance } from '@vkontakte/vk-bridge-react';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';
import '@vkontakte/vkui/dist/vkui.css';

import { Persik, Home } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';

export const App = () => {
  // Автоматически получаем тему из ВКонтакте (светлая или тёмная)
  const appearance = useAppearance() || 'light';
  
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME } = useActiveVkuiLocation();
  const [fetchedUser, setUser] = useState();

  useEffect(() => {
    async function fetchData() {
      try {
        await bridge.send('VKWebAppInit');
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUser(user);
      } catch (error) {
        console.log('Запуск вне ВКонтакте, данные профиля недоступны:', error);
      }
    }
    fetchData();
  }, []);

  return (
    <ConfigProvider appearance={appearance}>
      <AdaptivityProvider>
        <SplitLayout>
          <SplitCol>
            <View activePanel={activePanel}>
              <Home id="home" fetchedUser={fetchedUser} />
              <Persik id="persik" />
            </View>
          </SplitCol>
        </SplitLayout>
      </AdaptivityProvider>
    </ConfigProvider>
  );
};