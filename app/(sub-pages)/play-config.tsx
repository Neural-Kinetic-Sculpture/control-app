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
  const wave_type = eegData?.wave_type ?? '';
  const dominant_freq = eegData?.dominant_freq ?? 0;
  const psd = eegData?.psd ?? 0;
  const confidence = eegData?.confidence ?? 0;
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
    if (wave_type && timestamp) {
      const formattedTime = formatTimestamp(timestamp);
      const logEntry = `Wave: ${wave_type}, Freq: ${dominant_freq.toFixed(2)} Hz, PSD: ${psd.toFixed(2)}, Conf: ${confidence}, Time: ${formattedTime}`;
      setLogs((prevLogs) => {
        const updatedLogs = [logEntry, ...prevLogs];
        return updatedLogs.slice(0, 10); // Keep only latest 10
      });
    }
  }, [wave_type, dominant_freq, psd, confidence, timestamp]);

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
    if (!data) return [];
    return data.filter(config =>
      dominant_freq >= config.lower_range &&
      dominant_freq <= config.upper_range &&
      psd >= config.lower_PSD &&
      psd <= config.upper_PSD
    );
  }, [data, dominant_freq, psd]);

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

          <StartButton />

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
                    lower_PSD={config.lower_PSD}
                    upper_PSD={config.upper_PSD}
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