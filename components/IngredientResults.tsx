import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import LottieView from 'lottie-react-native';

type Props = React.PropsWithChildren<{
  isVisible: boolean;
  onClose: () => void;
  isLoading: boolean;
}>;

const { height } = Dimensions.get('window');

export default function IngredientResults({ isVisible, children, onClose, isLoading }: Props) {
  return (
    <Modal
      isVisible={isVisible}
      // Provide empty functions to prevent closing the modal
      onBackdropPress={() => {}} // Disable closing modal when tapping outside
      swipeDirection={[]} // Disable swipe gestures
      style={styles.modal}
      backdropTransitionOutTiming={0}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      propagateSwipe={true} // Allow inner scroll views to scroll
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
    height: height * 0.8, // Fixed height for the modal
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1, // Allows the ingredient list to take available space
  },
  lottie: {
    width: 200,
    height: 200,
  },
});