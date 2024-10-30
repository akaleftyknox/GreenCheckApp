// IngredientResults.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import LottieView from 'lottie-react-native';

type Props = React.PropsWithChildren<{
  isVisible: boolean;
  onClose: () => void;
  isLoading: boolean;
}>;

const { height } = Dimensions.get('window');

export default function IngredientResults({
  isVisible,
  children,
  onClose,
  isLoading,
}: Props) {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={() => {}}
      swipeDirection={[]}
      style={styles.modal}
      backdropTransitionOutTiming={0}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      propagateSwipe={true}
    >
      <View style={styles.modalContent}>
        <View style={styles.sheetHeader}>
          <View style={{ width: 60 }} />
          <Text style={styles.sheetHeaderTitle}>Ingredient Results</Text>
          <TouchableOpacity onPress={onClose}>
            <View style={{ width: 60, alignItems: 'flex-end' }}>
              <Text style={styles.done}>Done</Text>
            </View>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <View style={styles.animationContainer}>
            <LottieView
              source={require('@/assets/animations/analyzeAnimation.json')}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>
        ) : (
          <View style={styles.contentContainer}>{children}</View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    maxHeight: height * 0.8,
    width: '100%',
    backgroundColor: '#25292e',
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  sheetHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  done: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6a55',
  },
  animationContainer: {
    height: height * 0.8 - 70, // Adjust height to account for header
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flexShrink: 1,
  },
  lottie: {
    width: 200,
    height: 200,
  },
});