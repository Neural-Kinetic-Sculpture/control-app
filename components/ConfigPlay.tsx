import { View, Text, TouchableOpacity } from 'react-native';
import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor
} from 'react-native-reanimated';

type ConfigPlayProps = {
  name: string;
  lower: number;
  upper: number;
  color: string;  
  isActive: boolean;  
};

const ConfigPlay = ({ name, lower, upper, color, isActive }: ConfigPlayProps) => {
  const waveType = name.match(/^[A-Za-z]+/)?.[0] || name;
  const displayText = `${waveType} (${lower}-${upper})`;

  const animation = useSharedValue(0);

  useEffect(() => {
    animation.value = withTiming(isActive ? 1 : 0, { duration: 500 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      animation.value,
      [0, 1],
      ['#cbd5e1', color]
    );
    return {
      backgroundColor: bgColor,
    };
  });

  return (
    <View className="pt-3 px-1">
      <Animated.View style={[animatedStyle]} className="h-10 w-40 rounded-3xl">
        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-1 justify-center items-center"
        >
          <Text className="text-white text-sm font-bold">{displayText}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default ConfigPlay;
