import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ApiError } from "../../api/client";
import { createFood } from "../../api/foods";
import { scanFood } from "../../api/scan";
import type { FoodItem } from "../../types/models";
import { colors } from "../../ui/theme";
import { KaiTabBarPreview } from "../../ui/KaiTabBar";
import FoodPoolScreen from "../food/FoodPoolScreen";

type CapturedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: File;
};

type DraftFood = {
  id: number;
  name: string;
  quantity: string;
  confidence: number | null;
};

let nextDraftId = 1;

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const analysisRequestId = useRef(0);
  const sheetTranslateY = useRef(new Animated.Value(700)).current;
  const scanExitX = useRef(new Animated.Value(0)).current;
  const sheetPosition = useRef(0);
  const sheetDragStart = useRef(0);
  const transitioningRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [items, setItems] = useState<DraftFood[]>([]);
  const [analysed, setAnalysed] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [screenFocused, setScreenFocused] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [poolPreviewFoods, setPoolPreviewFoods] = useState<FoodItem[]>([]);

  const busy = capturing || analysing || saving || transitioning;
  const collapsedSheetY = Math.min(screenHeight * 0.36, 330);
  transitioningRef.current = transitioning;

  const sheetPanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      !transitioningRef.current && Math.abs(gesture.dy) > 5,
    onPanResponderGrant: () => {
      sheetDragStart.current = sheetPosition.current;
    },
    onPanResponderMove: (_, gesture) => {
      const nextPosition = Math.max(
        0,
        Math.min(collapsedSheetY, sheetDragStart.current + gesture.dy),
      );
      sheetPosition.current = nextPosition;
      sheetTranslateY.setValue(nextPosition);
    },
    onPanResponderRelease: (_, gesture) => {
      const nextPosition =
        gesture.vy < -0.45
          ? 0
          : gesture.vy > 0.45 || sheetPosition.current > collapsedSheetY / 2
            ? collapsedSheetY
            : 0;
      sheetPosition.current = nextPosition;
      Animated.spring(sheetTranslateY, {
        damping: 24,
        mass: 0.8,
        stiffness: 230,
        toValue: nextPosition,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderTerminate: () => {
      const nextPosition =
        sheetPosition.current > collapsedSheetY / 2 ? collapsedSheetY : 0;
      sheetPosition.current = nextPosition;
      Animated.spring(sheetTranslateY, {
        damping: 24,
        stiffness: 230,
        toValue: nextPosition,
        useNativeDriver: true,
      }).start();
    },
  });

  useFocusEffect(
    useCallback(() => {
      scanExitX.setValue(0);
      setScreenFocused(true);
      return () => {
        analysisRequestId.current += 1;
        sheetTranslateY.setValue(700);
        sheetPosition.current = 0;
        setScreenFocused(false);
        setCameraReady(false);
        setTorchEnabled(false);
        setImage(null);
        setItems([]);
        setAnalysed(false);
        setCapturing(false);
        setAnalysing(false);
        setSaving(false);
        setSaved(false);
        setError("");
        setMessage("");
        setGalleryOpen(false);
        setTransitioning(false);
        setPoolPreviewFoods([]);
      };
    }, [scanExitX, sheetTranslateY]),
  );

  const showSheet = (position: number) => {
    sheetPosition.current = position;
    sheetTranslateY.setValue(700);
    requestAnimationFrame(() => {
      Animated.spring(sheetTranslateY, {
        damping: 22,
        mass: 0.85,
        stiffness: 210,
        toValue: position,
        useNativeDriver: true,
      }).start();
    });
  };

  const expandSheet = () => {
    sheetPosition.current = 0;
    Animated.spring(sheetTranslateY, {
      damping: 23,
      mass: 0.85,
      stiffness: 210,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const analyseImage = async (capturedImage: CapturedImage) => {
    const requestId = ++analysisRequestId.current;
    setImage(capturedImage);
    setItems([]);
    setAnalysed(false);
    setSaved(false);
    setError("");
    setMessage("");
    setAnalysing(true);
    showSheet(collapsedSheetY);

    try {
      const response = await scanFood({
        uri: capturedImage.uri,
        fileName: capturedImage.fileName,
        mimeType: capturedImage.mimeType || undefined,
        file: capturedImage.file,
      });
      if (requestId !== analysisRequestId.current) return;
      setItems(
        response.items.map((item) => ({
          ...item,
          id: nextDraftId++,
          quantity: item.quantity || "",
        })),
      );
      setAnalysed(true);
      if (response.items.length === 0) {
        setMessage(
          "No food was recognised. Add it manually or take another photo.",
        );
      }
    } catch (caught) {
      if (requestId !== analysisRequestId.current) return;
      setAnalysed(true);
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Kai Pool could not analyse this photo.",
      );
    } finally {
      if (requestId === analysisRequestId.current) {
        setAnalysing(false);
        expandSheet();
      }
    }
  };

  const takePhoto = async () => {
    if (!cameraReady || !cameraRef.current || busy) return;

    setCapturing(true);
    setError("");
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.65,
        shutterSound: true,
      });
      if (!photo) throw new Error("No photo returned");
      await analyseImage({
        uri: photo.uri,
        fileName: "kai-pool-scan.jpg",
        mimeType: "image/jpeg",
      });
    } catch (caught) {
      if (!image) {
        setError("The photo could not be taken. Please try again.");
      }
    } finally {
      setCapturing(false);
    }
  };

  const choosePhoto = async () => {
    if (busy || galleryOpen) return;

    setGalleryOpen(true);
    setCameraReady(false);
    setTorchEnabled(false);
    setError("");
    try {
      if (Platform.OS !== "web") {
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.65,
      });
      if (!result.canceled) {
        setGalleryOpen(false);
        const asset = result.assets[0];
        await analyseImage({
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          file: asset.file,
        });
      }
    } catch {
      setError("The photo library could not be opened.");
    } finally {
      setGalleryOpen(false);
    }
  };

  const moveToFoodPool = () => {
    setTransitioning(true);
    scanExitX.setValue(0);
    requestAnimationFrame(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(scanExitX, {
            duration: 430,
            easing: Easing.out(Easing.cubic),
            toValue: screenWidth,
            useNativeDriver: true,
          }),
          Animated.timing(sheetTranslateY, {
            duration: 300,
            toValue: 700,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            router.replace("/(tabs)/food-pool");
          }
        });
      }, 120);
    });
  };

  const updateItem = (
    id: number,
    field: "name" | "quantity",
    value: string,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
    setSaved(false);
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { id: nextDraftId++, name: "", quantity: "", confidence: null },
    ]);
    setAnalysed(true);
    setSaved(false);
    setError("");
    setMessage("");
  };

  const removeItem = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setSaved(false);
  };

  const saveItems = async () => {
    if (!image || busy) return;
    if (items.length === 0) {
      setError("Add at least one food item before saving.");
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      setError("Each item needs a name.");
      return;
    }

    Keyboard.dismiss();
    setSaving(true);
    setError("");
    try {
      const savedFoods: FoodItem[] = [];
      for (const item of items) {
        savedFoods.push(
          await createFood({
            name: item.name.trim(),
            quantity: item.quantity.trim() || null,
            imageUrl: null,
            availability: "PRIVATE",
          }),
        );
      }
      setPoolPreviewFoods(savedFoods);
      setSaved(true);
      setMessage(
        `${items.length} ${items.length === 1 ? "item" : "items"} added to your Food Pool.`,
      );
      moveToFoodPool();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The food could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const retryAnalysis = () => {
    if (image && !busy) void analyseImage(image);
  };

  const reset = () => {
    if (busy) return;
    Animated.timing(sheetTranslateY, {
      duration: 220,
      toValue: 700,
      useNativeDriver: true,
    }).start(() => {
      setImage(null);
      setItems([]);
      setAnalysed(false);
      setCameraReady(false);
      setSaved(false);
      setError("");
      setMessage("");
    });
  };

  const leaveScanner = () => {
    analysisRequestId.current += 1;
    setAnalysing(false);
    router.replace("/(tabs)/food-pool");
  };

  if (!permission) {
    return (
      <View style={styles.loadingScreen}>
        {screenFocused ? <StatusBar style="light" /> : null}
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        {screenFocused ? <StatusBar style="light" /> : null}
        <Pressable
          accessibilityLabel="Leave scanner"
          onPress={leaveScanner}
          style={[styles.topButton, { left: 20, top: insets.top + 10 }]}
        >
          <Ionicons color="#FFFFFF" name="close" size={25} />
        </Pressable>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Ionicons color={colors.primary} name="camera" size={32} />
          </View>
          <Text style={styles.permissionTitle}>Scan food with your camera</Text>
          <Text style={styles.permissionBody}>
            Kai Pool needs camera access to recognise food in front of you.
          </Text>
          <Pressable
            onPress={() => {
              if (permission.canAskAgain) {
                void requestPermission();
              } else {
                void Linking.openSettings();
              }
            }}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>
              {permission.canAskAgain ? "Enable camera" : "Open settings"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      {transitioning ? (
        <SafeAreaView
          edges={["top", "bottom"]}
          pointerEvents="none"
          style={styles.poolBehind}
        >
          <View style={styles.poolBehindContent}>
            <FoodPoolScreen previewFoods={poolPreviewFoods} />
          </View>
          <KaiTabBarPreview activeRoute="food-pool" />
        </SafeAreaView>
      ) : null}

      <Animated.View
        style={[
          styles.scanForeground,
          { transform: [{ translateX: scanExitX }] },
        ]}
      >
      {screenFocused ? (
        <StatusBar
          backgroundColor="transparent"
          style={transitioning ? "dark" : "light"}
          translucent
        />
      ) : null}

      {image ? (
        <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} />
      ) : galleryOpen ? (
        <GalleryBackdrop bottomInset={insets.bottom} topInset={insets.top} />
      ) : screenFocused ? (
        <CameraView
          enableTorch={torchEnabled}
          facing={facing}
          onCameraReady={() => setCameraReady(true)}
          onMountError={({ message: cameraMessage }) =>
            setError(cameraMessage || "The camera could not start.")
          }
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={StyleSheet.absoluteFill} />
      )}

      {!galleryOpen ? (
        <View pointerEvents="none" style={styles.cameraShadeTop} />
      ) : null}
      {!image && !galleryOpen ? <FocusFrame /> : null}

      {!galleryOpen ? (
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <RoundIconButton
          accessibilityLabel="Leave scanner"
          icon="close"
          onPress={leaveScanner}
        />
        <View style={styles.titlePill}>
          <Text style={styles.scannerTitle}>Scan food</Text>
        </View>
        {image ? (
          <View style={styles.topBarSpacer} />
        ) : (
          <RoundIconButton
            accessibilityLabel={
              torchEnabled ? "Turn flash off" : "Turn flash on"
            }
            icon={torchEnabled ? "flash" : "flash-outline"}
            onPress={() => setTorchEnabled((current) => !current)}
          />
        )}
        </View>
      ) : null}

      {!image && !galleryOpen ? (
        <View
          style={[
            styles.cameraControls,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          <View style={styles.hintPill}>
            <Ionicons color="#FFFFFF" name="sparkles" size={15} />
            <Text style={styles.hintText}>Point at your food</Text>
          </View>

          {error ? (
            <View style={styles.cameraError}>
              <Text style={styles.cameraErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.captureRow}>
            <RoundIconButton
              accessibilityLabel="Choose a photo"
              icon="images-outline"
              onPress={() => void choosePhoto()}
              size="large"
            />
            <Pressable
              accessibilityLabel="Take photo and scan"
              disabled={!cameraReady || capturing}
              onPress={() => void takePhoto()}
              style={({ pressed }) => [
                styles.shutterOuter,
                (!cameraReady || capturing) && styles.disabled,
                pressed && styles.shutterPressed,
              ]}
            >
              {capturing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </Pressable>
            <RoundIconButton
              accessibilityLabel="Flip camera"
              icon="camera-reverse-outline"
              onPress={() =>
                setFacing((current) =>
                  current === "back" ? "front" : "back",
                )
              }
              size="large"
            />
          </View>
        </View>
      ) : null}

      {image ? (
        <Animated.View
          style={[
            styles.resultSheet,
            {
              paddingBottom: Math.max(insets.bottom, 14),
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View
            {...sheetPanResponder.panHandlers}
            accessibilityHint="Swipe up to expand or down to collapse scan results"
            accessibilityLabel="Resize scan results"
            style={styles.sheetDragArea}
          >
            <View style={styles.sheetHandle} />
          </View>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeadingCopy}>
              <Text style={styles.sheetEyebrow}>
                {analysing ? "SCANNING PHOTO" : "SCAN RESULTS"}
              </Text>
              {!analysing ? (
                <Text style={styles.sheetTitle}>
                  {saved
                    ? "Added to Food Pool"
                    : items.length > 0
                      ? `${items.length} ${items.length === 1 ? "item" : "items"} found`
                      : "Review your scan"}
                </Text>
              ) : null}
            </View>
            {!busy ? (
              <Pressable
                accessibilityLabel="Take another photo"
                onPress={reset}
                style={styles.sheetClose}
              >
                <Ionicons color={colors.text} name="close" size={22} />
              </Pressable>
            ) : null}
          </View>

          {analysing ? (
            <View style={styles.analysisState}>
              <View style={styles.analysisIcon}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
              <Text style={styles.analysisTitle}>Analysing automatically</Text>
              <Text style={styles.analysisBody}>
                Kai Pool is identifying each ingredient in the photo.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView
                contentContainerStyle={styles.resultsContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.resultsScroll}
              >
                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons
                      color={colors.error}
                      name="alert-circle-outline"
                      size={21}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {message ? (
                  <View style={saved ? styles.successBox : styles.messageBox}>
                    <Ionicons
                      color={saved ? colors.success : colors.secondary}
                      name={saved ? "checkmark-circle" : "information-circle"}
                      size={21}
                    />
                    <Text
                      style={saved ? styles.successText : styles.messageText}
                    >
                      {message}
                    </Text>
                  </View>
                ) : null}

                {items.map((item, index) => (
                  <FoodResultCard
                    index={index}
                    item={item}
                    key={item.id}
                    onRemove={() => removeItem(item.id)}
                    onUpdate={(field, value) =>
                      updateItem(item.id, field, value)
                    }
                  />
                ))}

                {!saved ? (
                  <Pressable onPress={addItem} style={styles.addItemButton}>
                    <Ionicons
                      color={colors.primary}
                      name="add-circle-outline"
                      size={20}
                    />
                    <Text style={styles.addItemText}>Add another item</Text>
                  </Pressable>
                ) : null}
              </ScrollView>

              <View style={styles.sheetActions}>
                {error && items.length === 0 ? (
                  <Pressable
                    disabled={busy}
                    onPress={retryAnalysis}
                    style={styles.secondaryAction}
                  >
                    <Ionicons color={colors.primary} name="sparkles" size={17} />
                    <Text style={styles.secondaryActionText}>Try scan again</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    disabled={busy}
                    onPress={reset}
                    style={styles.secondaryAction}
                  >
                    <Text style={styles.secondaryActionText}>Retake</Text>
                  </Pressable>
                )}
                <Pressable
                  disabled={busy || !analysed || items.length === 0}
                  onPress={() => void saveItems()}
                  style={({ pressed }) => [
                    styles.primaryAction,
                    (busy || !analysed || items.length === 0) &&
                      styles.disabled,
                    pressed && styles.primaryPressed,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryActionText}>
                        Add to Food Pool
                      </Text>
                      <Ionicons
                        color="#FFFFFF"
                        name="arrow-forward"
                        size={18}
                      />
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      ) : null}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function GalleryBackdrop({
  bottomInset,
  topInset,
}: {
  bottomInset: number;
  topInset: number;
}) {
  return (
    <View
      style={[
        styles.galleryBackdrop,
        { paddingBottom: Math.max(bottomInset, 20), paddingTop: topInset + 24 },
      ]}
    >
      <View style={styles.galleryHeader}>
        <View style={styles.galleryHeaderIcon}>
          <Ionicons color="#FFFFFF" name="images-outline" size={21} />
        </View>
        <View>
          <Text style={styles.galleryEyebrow}>KAI POOL SCANNER</Text>
          <Text style={styles.galleryTitle}>Choose a food photo</Text>
        </View>
      </View>

      <View style={styles.galleryArtwork}>
        <View style={[styles.galleryCardBack, styles.galleryCardLeft]} />
        <View style={[styles.galleryCardBack, styles.galleryCardRight]} />
        <View style={styles.galleryCardFront}>
          <View style={styles.gallerySun} />
          <Ionicons color="#D8EEE2" name="leaf" size={52} />
          <View style={styles.galleryGround} />
        </View>
      </View>

      <View style={styles.galleryTip}>
        <View style={styles.galleryTipIcon}>
          <Ionicons color={colors.primary} name="sparkles" size={18} />
        </View>
        <View style={styles.galleryTipCopy}>
          <Text style={styles.galleryTipTitle}>Pick a clear photo</Text>
          <Text style={styles.galleryTipBody}>
            Food should be well lit and fully visible for the best scan.
          </Text>
        </View>
      </View>
    </View>
  );
}

function FocusFrame() {
  return (
    <View pointerEvents="none" style={styles.focusFrame}>
      <View style={[styles.focusCorner, styles.topLeft]} />
      <View style={[styles.focusCorner, styles.topRight]} />
      <View style={[styles.focusCorner, styles.bottomLeft]} />
      <View style={[styles.focusCorner, styles.bottomRight]} />
    </View>
  );
}

function RoundIconButton({
  accessibilityLabel,
  icon,
  onPress,
  size = "regular",
}: {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: "regular" | "large";
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundButton,
        size === "large" && styles.roundButtonLarge,
        pressed && styles.roundButtonPressed,
      ]}
    >
      <Ionicons color="#FFFFFF" name={icon} size={size === "large" ? 24 : 22} />
    </Pressable>
  );
}

function FoodResultCard({
  index,
  item,
  onRemove,
  onUpdate,
}: {
  index: number;
  item: DraftFood;
  onRemove: () => void;
  onUpdate: (field: "name" | "quantity", value: string) => void;
}) {
  const confidence =
    item.confidence === null
      ? null
      : Math.round(item.confidence <= 1 ? item.confidence * 100 : item.confidence);

  return (
    <View style={styles.foodCard}>
      <View style={styles.foodCardTop}>
        <View style={styles.foodIcon}>
          <Ionicons color={colors.primary} name="leaf" size={18} />
        </View>
        <Text style={styles.foodNumber}>ITEM {index + 1}</Text>
        {confidence !== null ? (
          <Text style={styles.confidence}>{confidence}% match</Text>
        ) : null}
        <Pressable
          accessibilityLabel={`Remove item ${index + 1}`}
          onPress={onRemove}
          hitSlop={10}
          style={styles.removeButton}
        >
          <Ionicons color={colors.textMuted} name="trash-outline" size={18} />
        </Pressable>
      </View>
      <TextInput
        onChangeText={(value) => onUpdate("name", value)}
        placeholder="Food name"
        placeholderTextColor="#7A817C"
        style={styles.foodNameInput}
        value={item.name}
      />
      <View style={styles.quantityRow}>
        <Text style={styles.quantityLabel}>Quantity</Text>
        <TextInput
          onChangeText={(value) => onUpdate("quantity", value)}
          placeholder="e.g. 2 portions"
          placeholderTextColor="#7A817C"
          style={styles.quantityInput}
          value={item.quantity}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  poolBehind: {
    backgroundColor: colors.background,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  poolBehindContent: { flex: 1 },
  scanForeground: { backgroundColor: "#000000", flex: 1 },
  loadingScreen: {
    alignItems: "center",
    backgroundColor: "#07140E",
    flex: 1,
    justifyContent: "center",
  },
  cameraShadeTop: {
    backgroundColor: "rgba(0, 0, 0, 0.16)",
    height: 140,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 20,
    position: "absolute",
    right: 0,
    top: 0,
  },
  topBarSpacer: { height: 46, width: 46 },
  topButton: {
    alignItems: "center",
    backgroundColor: "rgba(20, 26, 22, 0.62)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    position: "absolute",
    width: 46,
  },
  roundButton: {
    alignItems: "center",
    backgroundColor: "rgba(20, 26, 22, 0.62)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  roundButtonLarge: { height: 52, width: 52 },
  roundButtonPressed: { backgroundColor: "rgba(20, 26, 22, 0.82)" },
  titlePill: {
    backgroundColor: "rgba(20, 26, 22, 0.48)",
    borderRadius: 999,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },
  scannerTitle: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  focusFrame: {
    bottom: "31%",
    left: 34,
    position: "absolute",
    right: 34,
    top: "24%",
  },
  focusCorner: {
    borderColor: "rgba(255, 255, 255, 0.94)",
    height: 50,
    position: "absolute",
    width: 50,
  },
  topLeft: { borderLeftWidth: 3, borderTopLeftRadius: 13, borderTopWidth: 3 },
  topRight: {
    borderRightWidth: 3,
    borderTopRightRadius: 13,
    borderTopWidth: 3,
    right: 0,
  },
  bottomLeft: {
    borderBottomLeftRadius: 13,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 0,
  },
  bottomRight: {
    borderBottomRightRadius: 13,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 0,
    right: 0,
  },
  cameraControls: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    bottom: 0,
    gap: 18,
    left: 0,
    paddingHorizontal: 24,
    paddingTop: 18,
    position: "absolute",
    right: 0,
  },
  hintPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(20, 26, 22, 0.62)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  hintText: {
    color: "#FFFFFF",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  captureRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: 340,
    width: "100%",
  },
  shutterOuter: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 4,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
  shutterInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 64,
    width: 64,
  },
  shutterPressed: { transform: [{ scale: 0.96 }] },
  cameraError: {
    backgroundColor: "rgba(91, 18, 18, 0.86)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cameraErrorText: {
    color: "#FFFFFF",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  disabled: { opacity: 0.45 },
  resultSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    bottom: 0,
    height: "76%",
    overflow: "hidden",
    position: "absolute",
    width: "100%",
  },
  sheetDragArea: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: "100%",
  },
  sheetHandle: {
    backgroundColor: "#D3D5D0",
    borderRadius: 999,
    height: 5,
    width: 42,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  sheetHeadingCopy: { flex: 1, gap: 3 },
  sheetEyebrow: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.1,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    letterSpacing: -0.4,
    lineHeight: 31,
  },
  sheetClose: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    marginLeft: 12,
    width: 40,
  },
  analysisState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    paddingBottom: 18,
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  analysisIcon: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    height: 62,
    justifyContent: "center",
    marginBottom: 12,
    width: 62,
  },
  analysisTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    marginBottom: 7,
  },
  analysisBody: {
    color: colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  resultsScroll: { flex: 1 },
  resultsContent: { gap: 12, paddingBottom: 14, paddingHorizontal: 20 },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: colors.errorContainer,
    borderRadius: 14,
    flexDirection: "row",
    gap: 9,
    padding: 13,
  },
  errorText: {
    color: colors.error,
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  messageBox: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    flexDirection: "row",
    gap: 9,
    padding: 13,
  },
  successBox: {
    alignItems: "flex-start",
    backgroundColor: "#E4F3E8",
    borderRadius: 14,
    flexDirection: "row",
    gap: 9,
    padding: 13,
  },
  messageText: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  successText: {
    color: colors.success,
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  foodCard: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.surfaceHigh,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  foodCardTop: { alignItems: "center", flexDirection: "row" },
  foodIcon: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    marginRight: 9,
    width: 32,
  },
  foodNumber: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
  },
  confidence: {
    color: colors.success,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginLeft: "auto",
  },
  removeButton: { marginLeft: 13, padding: 2 },
  foodNameInput: {
    borderBottomColor: colors.outline,
    borderBottomWidth: 1,
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    minHeight: 44,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  quantityRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  quantityLabel: {
    color: colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  quantityInput: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceHigh,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addItemButton: {
    alignItems: "center",
    borderColor: colors.outline,
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  addItemText: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  sheetActions: {
    borderTopColor: colors.surfaceHigh,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 13,
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: colors.outline,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
  },
  secondaryActionText: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  primaryPressed: { backgroundColor: colors.primaryContainer },
  galleryBackdrop: {
    backgroundColor: "#07140E",
    bottom: 0,
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 24,
    position: "absolute",
    right: 0,
    top: 0,
  },
  galleryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
  },
  galleryHeaderIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 15,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  galleryEyebrow: {
    color: "rgba(216, 238, 226, 0.66)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.15,
    marginBottom: 3,
  },
  galleryTitle: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  galleryArtwork: {
    alignItems: "center",
    alignSelf: "center",
    height: 230,
    justifyContent: "center",
    width: 250,
  },
  galleryCardBack: {
    backgroundColor: "#173124",
    borderColor: "rgba(216, 238, 226, 0.28)",
    borderRadius: 24,
    borderWidth: 1,
    height: 176,
    position: "absolute",
    width: 142,
  },
  galleryCardLeft: { transform: [{ rotate: "-12deg" }, { translateX: -30 }] },
  galleryCardRight: { transform: [{ rotate: "12deg" }, { translateX: 30 }] },
  galleryCardFront: {
    alignItems: "center",
    backgroundColor: "#2D4739",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 26,
    borderWidth: 1,
    height: 190,
    justifyContent: "center",
    overflow: "hidden",
    width: 154,
  },
  gallerySun: {
    backgroundColor: "#D7A168",
    borderRadius: 999,
    height: 36,
    position: "absolute",
    right: 23,
    top: 25,
    width: 36,
  },
  galleryGround: {
    backgroundColor: "#173124",
    borderRadius: 999,
    bottom: -42,
    height: 110,
    position: "absolute",
    transform: [{ rotate: "-8deg" }],
    width: 210,
  },
  galleryTip: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    padding: 16,
  },
  galleryTipIcon: {
    alignItems: "center",
    backgroundColor: "#D8EEE2",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  galleryTipCopy: { flex: 1 },
  galleryTipTitle: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 3,
  },
  galleryTipBody: {
    color: "rgba(255, 255, 255, 0.66)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  permissionScreen: {
    backgroundColor: "#07140E",
    flex: 1,
    justifyContent: "center",
  },
  permissionContent: { alignItems: "center", paddingHorizontal: 30 },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    height: 76,
    justifyContent: "center",
    marginBottom: 22,
    width: 76,
  },
  permissionTitle: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: "center",
  },
  permissionBody: {
    color: "rgba(255, 255, 255, 0.72)",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 26,
    maxWidth: 330,
    textAlign: "center",
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    minWidth: 190,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  permissionButtonText: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
