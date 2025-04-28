import { View, Text, Image, SafeAreaView, ScrollView, Dimensions, Modal, TouchableOpacity, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import Header from '@/components/Header';
import SignalButton from '@/components/SignalButton';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { TextInput } from "@/components/TextInput";
import { supabase } from '@/lib/supabase';
import { useConfigStore } from '../../store';
import { icons } from '../../constants'
import ColorPicker, { Panel1, Swatches, Preview, OpacitySlider, HueSlider } from 'reanimated-color-picker';
import { router, useLocalSearchParams } from 'expo-router';

const CreateConfigDetails = () => {
  const params = useLocalSearchParams();
  const configId = params.configId;
  const settingId = params.settingId;
  const isEditing = !!settingId; 

  const tempName = params.tempName;
  const tempHeight = params.tempHeight;
  const tempX = params.tempX;
  const tempY = params.tempY;

  const [selectedSignal, setSelectedSignal] = useState("Alpha (8 - 12 Hz)")
  const [rangeValues, setRangeValues] = useState([8, 12]); // Initial range values
  const screenWidth = Dimensions.get('window').width;
  const { x, y } = useConfigStore();
  const [selectedPanels, setSelectedPanels] = useState(new Set());

  const [brightness, setBrightness] = useState("")
  const [brightnessError, setBrightnessError] = useState("")
  const [speed, setSpeed] = useState("")
  const [speedError, setSpeedError] = useState("")
  const [direction, setDirection] = useState("")
  const [directionError, setDirectionError] = useState("")
  const [selectedColor, setSelectedColor] = useState('red') // Initial default color

  const [showModal, setShowModal] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);

  const signalRanges = {
    "Alpha (8 - 12 Hz)": [0, 100],
    "Beta (12 - 30 Hz)": [0, 100],
    "Gamma (30 - 50 Hz)": [0, 100],
    "Theta (4 - 8 Hz)": [0, 100],
    "Delta (<4 Hz)": [0, 100]
  };

  useEffect(() => {
    if (isEditing && settingId) {
      const fetchConfigData = async () => {
        try {
          const { data, error } = await supabase
            .from('config_settings')
            .select('*')
            .eq('id', settingId) 
            .single();
      
          if (error) {
            console.error('Supabase error:', error);
            throw error;
          }
      
          if (data) {
            console.log('Retrieved config data:', data);
            setSelectedSignal(data.selectedSignal || data.signal || data.setting_name || "Alpha (8 - 12 Hz)");
            setRangeValues([
              data.rangeValues_0 !== undefined ? data.rangeValues_0 : (data.lower_range || 8),
              data.rangeValues_1 !== undefined ? data.rangeValues_1 : (data.upper_range || 12)
            ]);
            
            if (data.selectedPanels || data.selected_panels) {
              const panelsArray = data.selectedPanels || data.selected_panels;
              if (Array.isArray(panelsArray)) {
                setSelectedPanels(new Set(panelsArray));
              }
            }
            
            setBrightness(data.brightness !== undefined ? data.brightness.toString() : "");
            setSpeed(data.speed !== undefined ? data.speed.toString() : "");
            setDirection(data.direction || "");
            setSelectedColor(data.selectedColor || data.color || 'red');
          }
        } catch (error) {
          console.error('Error fetching config data:', error);
          Alert.alert('Error', 'Could not load configuration data');
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchConfigData();
    } else {
      setIsLoading(false);
    }
  }, [settingId, isEditing]);

  const onSelectColor = ({ hex }) => {
    setSelectedColor(hex) 
    console.log(hex)
  }

  useEffect(() => {
    if (selectedSignal && signalRanges[selectedSignal]) {
      setRangeValues(signalRanges[selectedSignal]);
    }
  }, [selectedSignal]);

  const handleBrightnessChange = (text) => {
    setBrightness(text);
    const numValue = parseFloat(text);
    
    if (text.trim() === "") {
      setBrightnessError("Brightness is required");
    } else if (isNaN(numValue)) {
      setBrightnessError("Please enter a valid number");
    } else if (numValue < 0 || numValue > 100) {
      setBrightnessError("Brightness must be between 0-100%");
    } else {
      setBrightnessError("");
    }
  };

  const handleSpeedChange = (text) => {
    setSpeed(text);
    const numValue = parseFloat(text);
    
    if (text.trim() === "") {
      setSpeedError("Speed is required");
    } else if (isNaN(numValue)) {
      setSpeedError("Please enter a valid number");
    } else if (numValue < 0 || numValue > 5) {
      setSpeedError("Speed must be between 0-5 m/s");
    } else {
      setSpeedError("");
    }
  };

  const handleDirectionChange = (text) => {
    setDirection(text);
    const lowerText = text.toLowerCase().trim();
    
    if (text.trim() === "") {
      setDirectionError("Direction is required");
    } else if (lowerText !== "up" && lowerText !== "down") {
      setDirectionError('Direction must be "up" or "down"');
    } else {
      setDirectionError("");
    }
  };

  useEffect(() => {
    const formIsValid = 
      brightness.trim() !== "" && 
      speed.trim() !== "" && 
      direction.trim() !== "" &&
      !brightnessError &&
      !speedError &&
      !directionError;
    
    setIsFormValid(formIsValid);
  }, [brightness, speed, direction, brightnessError, speedError, directionError]);

  const togglePanel = (row, col) => {
    const panelId = `${row}-${col}`;
    setSelectedPanels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return newSet;
    });
  };

  const handlePress = async () => {
    if (isFormValid) {
      try {
        let operation;
  
        const configData = {
          setting_name: selectedSignal,
          signal: selectedSignal,
          lower_range: rangeValues[0],
          upper_range: rangeValues[1],
          selected_panels: Array.from(selectedPanels),
          brightness: parseFloat(brightness),
          speed: parseFloat(speed),
          direction: direction.toLowerCase(),
          color: selectedColor,
          config_id: configId || null // Make sure to pass the configId
        };
        
        if (isEditing) {
          operation = supabase
            .from('config_settings')
            .update(configData)
            .eq('id', settingId); // Use settingId for editing
        } else {
          operation = supabase
            .from('config_settings')
            .insert([configData]);
        }
        
        const { error } = await operation;
        
        if (error) throw error;
        
        console.log(`SUCCESSFULLY ${isEditing ? 'UPDATED' : 'UPLOADED TO'} config_settings`);
        Alert.alert(
          "Success", 
          `Configuration ${isEditing ? 'updated' : 'saved'} successfully`,
          [{ text: "OK", onPress: () => router.push({
            pathname: "/create-config",
            params: configId ? 
              { configId, returnFromDetails: true } : 
              { tempName, tempHeight, tempX, tempY, returnFromDetails: true } 
          })}]
        );
      } catch (error) {
        console.error('Error saving configuration:', error);
        Alert.alert('Error', 'Failed to save configuration');
      }
    } else {
      console.log('UNSUCCESSFULLY UPLOADED TO config_settings');
      Alert.alert(
        "Missing or Invalid Information",
        "Please correct all errors before saving your configuration.",
        [{ text: "OK" }]
      );
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView className="bg-white h-full">  
      <ScrollView contentContainerStyle={{flexGrow: 1, paddingBottom: 20}}>
        <View className="items-center w-full justify-center">
          <View className="w-full px-4 mt-2">
            <TouchableOpacity 
              onPress={handleBack}
              className="flex-row items-center bg-lightPurple px-2 py-1 w-20 rounded-xl"
            >
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
            title={isEditing ? "Edit configuration" : "Create a new configuration"}
            header={isEditing ? "Edit your configuration below" : "Add and edit new ranges below"}
          />

          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <Text>Loading configuration data...</Text>
            </View>
          ) : (
            <>
              <Text className="mt-4 font-bold text-xl self-start ml-7 text-darkPurple">Choose a signal:</Text>
              <View className="mt-4 bg-medYellow w-11/12 py-3 rounded-3xl flex-wrap flex-row justify-center items-center">
                {["Alpha (8 - 12 Hz)", "Beta (12 - 30 Hz)", "Gamma (30 - 50 Hz)", 
                  "Theta (4 - 8 Hz)", "Delta (<4 Hz)"].map((signal, index) => (
                  <View key={signal} className={`w-1/2 mt-5 ${index === 4 ? "w-full flex items-center" : "justify-center items-center"}`}>
                    <SignalButton 
                      title={signal}
                      isSelected={selectedSignal === signal}
                      onPress={() => setSelectedSignal(signal)}
                    />
                  </View>
                ))}
              </View>

              <Text className="mt-4 font-bold text-xl self-start ml-7 text-darkPurple">Specify a range:</Text>
              <View className="mt-4 bg-medYellow w-11/12 h-52 py-3 rounded-3xl items-center">
                <Text className="text-darkPurple px-14 pb-2 text-center font-medium mt-4">
                  Select a range (0 to 100) of the power band intensity.
                </Text>
                <Text className="text-darkPurple px-14 text-center font-bold">
                  {selectedSignal}
                </Text>

                <MultiSlider
                  values={rangeValues}
                  onValuesChange={(values) => setRangeValues(values)}
                  min={signalRanges[selectedSignal][0]}
                  max={signalRanges[selectedSignal][1]}
                  step={1}
                  allowOverlap={false}
                  snapped
                  containerStyle={{
                    height: 40,
                    marginTop: 10
                  }}
                  selectedStyle={{
                    backgroundColor: '#47313E'
                  }}
                  unselectedStyle={{
                    backgroundColor: '#E5E7EB' // light gray
                  }}
                  sliderLength={screenWidth * 0.75} // 75% of screen width
                  markerStyle={{
                    backgroundColor: '#47313E',
                    height: 20,
                    width: 20,
                  }}
                  trackStyle={{
                    height: 6,
                    borderRadius: 3,
                  }}
                />

                <View className="flex-row">
                  <Text className="text-darkPurple px-2 pb-2 text-center font-normal mt-4">
                    Selected range: 
                  </Text>
                  <Text className="text-darkPurple pb-2 text-center font-normal mt-4">
                    {rangeValues[0]} to {rangeValues[1]}
                  </Text>
                </View>
              </View>

              <Text className="mt-4 font-bold text-xl self-start ml-7 text-darkPurple">
                Choose panels to configure:
              </Text>
              <View className="mt-4 bg-medYellow w-11/12 py-3 rounded-3xl items-center">
                {Array.from({ length: parseInt(y) || 0 }).map((_, row) => (
                  <View key={row} className="flex-row">
                    {Array.from({ length: parseInt(x) || 0 }).map((_, col) => {
                      const isSelected = selectedPanels.has(`${row}-${col}`);
                      return (
                        <TouchableOpacity
                          key={`${row}-${col}`}
                          onPress={() => togglePanel(row, col)}
                          className={`w-12 h-12 m-1 rounded-lg ${
                            isSelected ? 'bg-darkPurple' : 'bg-lightPurple'
                          }`}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>

              <Text className="mt-4 font-bold text-xl self-start ml-7 text-darkPurple">
                Configure your sculpture's animations:
              </Text>
              <View className="mt-4 bg-medYellow w-11/12 py-3 rounded-3xl flex-wrap flex-row justify-center items-center px-4">
                <View className="w-full mb-4">
                  <View className="flex-row items-center space-x-4 w-full">
                    <Text className="text-darkPurple font-medium">Brightness:   </Text>
                    <TextInput 
                      className="bg-lightYellow px-4 py-2 rounded-lg flex-1"
                      value={brightness}
                      onChangeText={handleBrightnessChange}
                      placeholder="Enter brightness (0-100%)"
                      keyboardType="numeric"
                    />
                  </View>
                  {brightnessError ? (
                    <Text className="text-red-500 ml-20 mt-1">{brightnessError}</Text>
                  ) : null}
                </View>

                <View className="w-full mb-4">
                  <View className="flex-row items-center space-x-4 w-full">
                    <Text className="text-darkPurple font-medium">Speed:   </Text>
                    <TextInput 
                      className="bg-lightYellow px-4 py-2 rounded-lg flex-1"
                      value={speed}
                      onChangeText={handleSpeedChange}
                      placeholder="Enter speed (int from 0-5 m/s)"
                      keyboardType="number-pad"
                      />
                  </View>
                  {speedError ? (
                    <Text className="text-red-500 ml-20 mt-1">{speedError}</Text>
                  ) : null}
                </View>

                <View className="w-full mb-4">
                  <View className="flex-row items-center space-x-4 w-full">
                    <Text className="text-darkPurple font-medium">Direction:   </Text>
                    <TextInput 
                      className="bg-lightYellow px-4 py-2 rounded-lg flex-1"
                      value={direction}
                      onChangeText={handleDirectionChange}
                      placeholder="Enter direction (up/down)"
                    />
                  </View>
                  {directionError ? (
                    <Text className="text-red-500 ml-20 mt-1">{directionError}</Text>
                  ) : null}
                </View>

                <View className="flex-row items-center space-x-4 w-full mb-4">
                  <Text className="text-darkPurple font-medium">Color:   </Text>
                  <View className="justify-center flex-1">
                    <TouchableOpacity 
                      onPress={() => setShowModal(true)}
                      className="bg-lightPurple px-3 py-3 rounded-lg"
                    >
                      <Text className="text-white font-medium text-center">Choose your color</Text>
                    </TouchableOpacity>

                    <Modal 
                      visible={showModal} 
                      animationType='slide'
                      transparent={true}
                    >
                      <View className="flex-1 justify-center items-center bg-black/50">
                        <View className="bg-white p-6 rounded-xl w-11/12">
                          <ColorPicker 
                            style={{ width: '100%' }} 
                            value={selectedColor}
                            onComplete={onSelectColor}
                          >
                            <Preview />
                            <Panel1 />
                            <HueSlider />
                            <OpacitySlider />
                            <Swatches />
                          </ColorPicker>

                          <TouchableOpacity 
                            onPress={() => setShowModal(false)}
                            className="bg-lightPurple mt-4 px-6 py-3 rounded-lg"
                          >
                            <Text className="text-white font-medium text-center">Done</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  </View>
                </View>
                <Text className="text-darkPurple font-medium">Selected color: </Text>
                <Text className="text-darkPurple font-medium">{selectedColor}</Text>
                <View className="w-full px-2 flex-1">
                  <Text style={{ backgroundColor: selectedColor }} className="text-darkPurple font-medium py-2 rounded-md text-center w-full"></Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={handlePress}
                activeOpacity={isFormValid ? 0.7 : 1}
                className={`mt-5 h-10 w-[340px] rounded-xl ${isFormValid ? 'bg-darkPurple' : 'bg-gray-400'} justify-center items-center`}>

                <View className="flex-row items-center justify-between px-6">
                  <Text className="text-white font-medium items-center flex-1 text-center">
                    {isEditing ? "Update configuration" : "Save your configuration"}
                  </Text>
                  <Image
                    source={icons.bookmark}
                    tintColor="white"
                    resizeMode="contain"
                    className="w-5 h-5"
                  />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateConfigDetails;