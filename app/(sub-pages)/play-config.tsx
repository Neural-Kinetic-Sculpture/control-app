import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { icons } from '@/constants';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import ConfigPlay from '@/components/ConfigPlay';
import ConfigDetails from '@/components/ConfigDetails';
import StartButton from '@/components/StartButton';
import { useConfigStore } from '../../store';

const PlayConfig = () => {
  const { configId } = useLocalSearchParams();
  const eegData = useConfigStore((state) => state.eegData);  
  const isPlaying = useConfigStore((state) => state.isPlaying);  
  const alpha_band = eegData?.alpha_band ?? -1;
  const beta_band = eegData?.beta_band ?? -1;
  const theta_band = eegData?.theta_band ?? -1;
  const delta_band = eegData?.delta_band ?? -1;
  const gamma_band = eegData?.gamma_band ?? -1;
  const dominant_band = eegData?.dominant_band ?? -1;
  const alpha_beta_ratio = eegData?.alpha_beta_ratio ?? -1;
  const alpha_delta_ratio = eegData?.alpha_delta_ratio ?? -1;
  const peak_alpha_freq = eegData?.peak_alpha_freq ?? -1;
  const psd = eegData?.psd ?? -1;
  const timestamp = eegData?.timestamp ?? '';
  
  const [fetchError, setFetchError] = useState('');
  const [data, setData] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [logs, setLogs] = useState([]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) {
            return timestamp;
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.log('Error formatting timestamp:', error);
      return timestamp;
    }
  };

  useEffect(() => {
    if (dominant_band && timestamp) {
      const formattedTime = formatTimestamp(timestamp);
      const logEntry = `Dominant band: ${dominant_band}, alpha: ${alpha_band.toFixed(2)}, beta: ${beta_band.toFixed(2)}, theta: ${theta_band.toFixed(2)}, delta: ${delta_band.toFixed(2)}, gamma: ${gamma_band.toFixed(2)}, peak alpha freq: ${peak_alpha_freq.toFixed(2)}, psd: ${psd.toFixed(2)}, Time: ${formattedTime}`;
      setLogs((prevLogs) => {
        const updatedLogs = [logEntry, ...prevLogs];
        return updatedLogs.slice(0, 20); // Keep only latest 20
      });
    }
  }, [alpha_band, beta_band, theta_band, delta_band, gamma_band, dominant_band, alpha_beta_ratio, alpha_delta_ratio, peak_alpha_freq, psd, timestamp]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData?.user?.id;
      if (!userId) throw new Error("User ID not found");

      const { data: settingsData, error: settingsError } = await supabase
        .from('config_settings')
        .select('*')
        .eq('config_id', configId);

      if (settingsError) {
        setFetchError('Could not fetch the config settings');
        setData([]);
        console.log("Supabase query error:", settingsError);
        return;
      }

      const { data: configTableData, error: configError } = await supabase
        .from('configs')
        .select('*')
        .eq('id', configId)
        .single();

      if (configError) {
        setFetchError('Could not fetch the config data');
        setConfigData(null);
        console.log("Supabase query error:", configError);
        return;
      }

      setData(settingsData);
      setConfigData(configTableData);
      setFetchError('');
    } catch (err) {
      console.error('Error fetching configurations:', err);
      setFetchError('An unexpected error occurred');
    }
  };

  const activeConfigs = useMemo(() => {
    if (!data || !isPlaying) return [];
  
    return data.filter(config => {
      if (config.setting_name.toLowerCase().includes('alpha')) {
        return alpha_band >= config.lower_range && alpha_band <= config.upper_range;
      } else if (config.setting_name.toLowerCase().includes('beta')) {
        return beta_band >= config.lower_range && beta_band <= config.upper_range;
      } else if (config.setting_name.toLowerCase().includes('theta')) {
        return theta_band >= config.lower_range && theta_band <= config.upper_range;
      } else if (config.setting_name.toLowerCase().includes('delta')) {
        return delta_band >= config.lower_range && delta_band <= config.upper_range;
      } else if (config.setting_name.toLowerCase().includes('gamma')) {
        return gamma_band >= config.lower_range && gamma_band <= config.upper_range;
      } else {
        return false;
      }
    });
  }, [data, isPlaying, alpha_band, beta_band, theta_band, delta_band, gamma_band]);
  

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="items-center w-full justify-center">
          <View className="w-full px-4 mt-2">
            <TouchableOpacity
              onPress={handleBack}
              className="flex-row items-center bg-lightPurple px-2 py-1 w-20 rounded-xl">
              <Image
                source={icons.leftArrow}
                resizeMode="contain"
                tintColor="#47313E"
                className="w-4 h-4"
              />
              <Text className="text-white ml-3">Back</Text>
            </TouchableOpacity>
          </View>

          <Header 
            title={"Play your configuration"}
            header={"Enjoy the performance!"}
          />

        <StartButton activeConfigs={activeConfigs} />

          {fetchError && (<Text className="text-red-500 mt-2">{fetchError}</Text>)}

          {data && data.length > 0 ? (
            <View className="flex-row flex-wrap justify-center w-full px-4">
              {data.map(config => {
                const isActive = activeConfigs.some(active => active.id === config.id);
                return (
                  <View key={config.id} className="w-44">
                    <ConfigPlay
                      name={config.setting_name}
                      lower={config.lower_range}
                      upper={config.upper_range}
                      color={config.color}
                      isActive={isActive}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <Text className="mt-2 text-gray-500 italic">No configs found. Add a config to get started.</Text>
          )}

          {activeConfigs.length > 0 ? (
            <View className="items-center justify-center">
              {activeConfigs.map(config => (
                <View key={config.id}>
                  <ConfigDetails
                    name={config.setting_name}
                    brightness={config.brightness}
                    speed={config.speed}
                    direction={config.direction}
                    color={config.color}
                    selectedPanels={config.selected_panels}
                    x={configData?.panels_x}
                    y={configData?.panels_y}
                    lower={config.lower_range}
                    upper={config.upper_range}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Text className="mt-2 text-gray-500 italic">No configs being played right now.</Text>
          )}

          <View className="w-full px-4 mt-6">
            <Text className="text-base font-semibold mb-2">Live EEG Log</Text>
            <View className="bg-gray-100 p-3 rounded-xl max-h-64">
              <ScrollView>
                {logs.length === 0 ? (
                  <Text className="text-gray-400 italic">Waiting for EEG data...</Text>
                ) : (
                  logs.map((log, index) => (
                    <Text key={index} className="text-sm text-gray-700 mb-1">{log}</Text>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlayConfig;