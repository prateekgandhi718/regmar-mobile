import { Feather } from "@expo/vector-icons";
import { createContext, ReactNode, useContext } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { PAPER, PAPER_FONTS, PAPER_SPACING } from "@/theme/newspaper-theme";
import { ChartFrame } from "./charts";

type GridContextValue = { columns: number; mobile: boolean };
const GridContext = createContext<GridContextValue>({ columns: 24, mobile: true });

export type NewspaperLayoutProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function NewspaperLayout({ children, style, scroll = false, contentContainerStyle }: NewspaperLayoutProps) {
  const content = (
    <View style={[styles.layout, style]}>
      <View style={[styles.page, contentContainerStyle]}>{children}</View>
    </View>
  );

  return scroll ? (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  ) : content;
}

export type NewspaperSectionProps = {
  columns?: number;
  gap?: number;
  divider?: "none" | "top" | "bottom" | "both";
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function NewspaperSection({ columns = 24, gap = PAPER_SPACING.xl, divider = "none", children, style }: NewspaperSectionProps) {
  const { width } = useWindowDimensions();
  const mobile = width < 640;
  const clampedColumns = Math.max(1, Math.min(columns, 24));
  const dividerStyle = {
    ...(divider === "top" || divider === "both" ? { borderTopWidth: 1, borderTopColor: PAPER.hairline } : {}),
    ...(divider === "bottom" || divider === "both" ? { borderBottomWidth: 1, borderBottomColor: PAPER.hairline } : {}),
  };

  return (
    <GridContext.Provider value={{ columns: clampedColumns, mobile }}>
      <View
        style={[
          styles.section,
          { gap },
          dividerStyle,
          divider === "top" || divider === "both" ? styles.sectionTopPadding : null,
          divider === "bottom" || divider === "both" ? styles.sectionBottomPadding : null,
          style,
        ]}
      >{children}</View>
    </GridContext.Provider>
  );
}

export function NewspaperArticle({ span, children, style }: NewspaperArticleProps) {
  const { columns, mobile } = useContext(GridContext);
  const resolvedSpan = Math.max(1, Math.min(span ?? columns, columns));
  return (
    <View
      style={[
        styles.article,
        mobile
          ? styles.mobileArticle
          : {
              flexGrow: resolvedSpan,
              flexBasis: 0,
              minWidth: 0,
            },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export type NewspaperArticleProps = {
  span?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Masthead({
  title,
  kicker,
  edition,
  date,
  price,
  logo,
  style,
}: {
  title: string;
  kicker?: string;
  edition?: string;
  date?: string;
  price?: string;
  logo?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const mastheadSize = Math.min(96, Math.max(48, width * 0.08));

  return (
    <View style={[styles.masthead, style]}>
      <Rule variant="double" />
      {kicker ? <Kicker style={styles.mastheadKicker}>{kicker}</Kicker> : null}
      <View style={styles.mastheadTitleRow}>
        {logo ? <View style={styles.mastheadLogo}>{logo}</View> : null}
        <Text style={[styles.mastheadTitle, { fontSize: mastheadSize, lineHeight: mastheadSize }]}>{title}</Text>
      </View>
      {edition || date || price ? (
        <View style={styles.mastheadMeta}>
          <Text style={styles.metaText}>{edition}</Text>
          <Text style={styles.metaText}>{date}</Text>
          <Text style={styles.metaText}>{price}</Text>
        </View>
      ) : null}
      <Rule variant="double" />
    </View>
  );
}

export function Folio({ page, section, date, publication, style }: { page: string; section?: string; date?: string; publication?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.folio, style]}>
      <Text style={styles.folioStrong}>{page}</Text>
      {section ? <Text style={styles.metaText}>{section}</Text> : null}
      {publication ? <Text style={styles.metaText}>{publication}</Text> : null}
      {date ? <Text style={styles.metaText}>{date}</Text> : null}
    </View>
  );
}

export function Kicker({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.kicker, style]}>{children}</Text>;
}

export function Headline({ children, weight = "High", style }: { children: ReactNode; weight?: "High" | "Medium" | "Low"; style?: any }) {
  return <Text style={[headlineStyles[weight], style]}>{children}</Text>;
}

export function Subhead({ children, style }: { children: ReactNode; style?: any }) {
  return <Text style={[styles.subhead, style]}>{children}</Text>;
}

export function Byline({ children, style }: { children: ReactNode; style?: any }) {
  return <Text style={[styles.byline, style]}>{children}</Text>;
}

export function BodyText({ children, weight = "Medium", style }: { children: ReactNode; weight?: "High" | "Medium" | "Low"; columns?: 1 | 2 | 3 | 4; dropCap?: boolean; style?: TextStyle }) {
  return <View style={styles.bodyText}><Text style={[bodyStyles[weight], style]}>{children}</Text></View>;
}

export function Rule({ variant = "hairline", orientation = "horizontal", style }: { variant?: "hairline" | "double" | "thick"; orientation?: "horizontal" | "vertical"; style?: StyleProp<ViewStyle> }) {
  if (orientation === "vertical") {
    if (variant === "double") {
      return <View style={[styles.verticalDoubleRule, style]}><View style={styles.verticalDoubleLineStart} /><View style={styles.verticalDoubleLineEnd} /></View>;
    }
    return <View style={[styles.verticalRule, variant === "thick" ? styles.thickVerticalRule : null, style]} />;
  }

  if (variant === "double") {
    return <View style={[styles.doubleRule, style]}><View style={styles.doubleLineStart} /><View style={styles.doubleLineEnd} /></View>;
  }

  return (
    <View
      style={[
        styles.rule,
        variant === "hairline" ? styles.hairline : null,
        variant === "thick" ? styles.thickRule : null,
        style,
      ]}
    />
  );
}

export function Factbox({ title, children, accent = false, style }: { title?: string; children: ReactNode; accent?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.factbox, accent ? styles.factboxAccent : null, style]}>
      {title ? <Text style={[styles.factboxTitle, accent ? styles.accentText : null]}>{title}</Text> : null}
      {title ? <Rule /> : null}
      <View style={styles.factboxBody}>{children}</View>
    </View>
  );
}

export type IndexItem = { page: string; title: string; headline?: string; onPress?: () => void };

export function IndexBox({ title = "Inside", items, style }: { title?: string; items: IndexItem[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.indexBox, style]}>
      <Text style={styles.indexTitle}>{title}</Text>
      {items.map((item, index) => (
        <Pressable key={`${item.page}-${item.title}-${index}`} onPress={item.onPress} disabled={!item.onPress} style={[styles.indexRow, index === items.length - 1 ? styles.indexLastRow : null]}>
          <Text style={styles.indexPage}>{item.page}</Text>
          <Text style={styles.indexSection}>{item.title}</Text>
          {item.headline ? <Text style={styles.indexHeadline} numberOfLines={2}>{item.headline}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

export function PaperInput({ label, hint, error, ...props }: TextInputProps & { label?: string; hint?: string; error?: string }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        {...props}
        placeholderTextColor={props.placeholderTextColor ?? PAPER.muted}
        style={[styles.input, props.style]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function PaperButton({ children, onPress, variant = "primary", loading = false, disabled = false, style }: { children: ReactNode; onPress?: () => void; variant?: "primary" | "secondary" | "quiet" | "danger"; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const colors = {
    primary: { backgroundColor: PAPER.accent, color: PAPER.page, borderColor: PAPER.accent },
    secondary: { backgroundColor: PAPER.highlight, color: PAPER.ink, borderColor: PAPER.hairline },
    quiet: { backgroundColor: "transparent", color: PAPER.ink, borderColor: PAPER.hairline },
    danger: { backgroundColor: "transparent", color: PAPER.accent, borderColor: PAPER.accent },
  }[variant];

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[styles.button, { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor }, disabled ? styles.disabledButton : null, style]}>
      {loading ? <ActivityIndicator size="small" color={colors.color} /> : <Text style={[styles.buttonText, { color: colors.color }]}>{children}</Text>}
    </Pressable>
  );
}

export function PaperDrawer({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title?: string; description?: string; children: ReactNode }) {
  return (
    <Modal visible={open} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.drawer}>
          <View style={styles.drawerHandle} />
          {title ? <Headline weight="Low">{title}</Headline> : null}
          {description ? <Subhead>{description}</Subhead> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

export { ChartFrame };

const headlineStyles = StyleSheet.create({
  High: { fontFamily: PAPER_FONTS.display, color: PAPER.ink, fontSize: 48, lineHeight: 50, letterSpacing: -0.48, marginBottom: 16 },
  Medium: { fontFamily: PAPER_FONTS.display, color: PAPER.ink, fontSize: 32, lineHeight: 35, letterSpacing: -0.16, marginBottom: 12 },
  Low: { fontFamily: PAPER_FONTS.bodyMedium, color: PAPER.body, fontSize: 22, lineHeight: 26, marginBottom: 8 },
});

const bodyStyles = StyleSheet.create({
  High: { fontFamily: PAPER_FONTS.body, color: PAPER.body, fontSize: 16, lineHeight: 26 },
  Medium: { fontFamily: PAPER_FONTS.body, color: PAPER.body, fontSize: 15, lineHeight: 23 },
  Low: { fontFamily: PAPER_FONTS.body, color: PAPER.secondary, fontSize: 13, lineHeight: 20 },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: PAPER.page },
  scrollContent: { flexGrow: 1 },
  layout: { flex: 1, backgroundColor: PAPER.page },
  page: { width: "100%", maxWidth: 1280, alignSelf: "center", paddingHorizontal: PAPER_SPACING.xl, paddingTop: PAPER_SPACING.xl, paddingBottom: PAPER_SPACING.xxl },
  section: { width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" },
  sectionTopPadding: { paddingTop: PAPER_SPACING.lg },
  sectionBottomPadding: { paddingBottom: PAPER_SPACING.lg },
  article: { minWidth: 0 },
  mobileArticle: { width: "100%", flexGrow: 0, flexBasis: "100%" },
  masthead: { width: "100%", alignItems: "stretch", marginBottom: PAPER_SPACING.lg },
  mastheadTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: PAPER_SPACING.sm },
  mastheadLogo: { opacity: 0.82 },
  mastheadKicker: { marginTop: PAPER_SPACING.sm, marginBottom: PAPER_SPACING.sm },
  mastheadTitle: { fontFamily: PAPER_FONTS.mastheadBold, color: PAPER.ink, fontSize: 56, lineHeight: 56, letterSpacing: 1.1, textAlign: "center", marginTop: PAPER_SPACING.sm, marginBottom: PAPER_SPACING.md },
  mastheadMeta: { flexDirection: "row", justifyContent: "space-between", gap: PAPER_SPACING.sm, paddingVertical: PAPER_SPACING.sm },
  folio: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: PAPER_SPACING.sm, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, paddingBottom: PAPER_SPACING.sm, marginBottom: PAPER_SPACING.lg },
  folioStrong: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.secondary, fontSize: 10, letterSpacing: 0.8 },
  metaText: { flexShrink: 1, fontFamily: PAPER_FONTS.metaMedium, color: PAPER.muted, fontSize: 10, letterSpacing: 0.7, textTransform: "uppercase" },
  kicker: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.accent, fontSize: 12, lineHeight: 15, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: PAPER_SPACING.xs },
  subhead: { fontFamily: PAPER_FONTS.bodyItalic, color: PAPER.secondary, fontSize: 16, lineHeight: 22, marginBottom: PAPER_SPACING.sm },
  byline: { fontFamily: PAPER_FONTS.metaMedium, color: PAPER.secondary, fontSize: 11, lineHeight: 16, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: PAPER_SPACING.md },
  bodyText: { width: "100%" },
  bodyCopy: { fontFamily: PAPER_FONTS.body, color: PAPER.body, fontSize: 15, lineHeight: 23 },
  rule: { width: "100%", height: 1 },
  hairline: { backgroundColor: PAPER.hairline },
  thickRule: { height: 3, backgroundColor: PAPER.decorative },
  doubleRule: { width: "100%", height: 8, position: "relative" },
  doubleLineStart: { position: "absolute", left: 0, right: 0, top: 0, height: 1, backgroundColor: PAPER.decorative },
  doubleLineEnd: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: PAPER.decorative },
  verticalRule: { width: 1, alignSelf: "stretch", backgroundColor: PAPER.hairline },
  thickVerticalRule: { width: 3, backgroundColor: PAPER.decorative },
  verticalDoubleRule: { width: 8, alignSelf: "stretch", position: "relative" },
  verticalDoubleLineStart: { position: "absolute", top: 0, bottom: 0, left: 0, width: 1, backgroundColor: PAPER.decorative },
  verticalDoubleLineEnd: { position: "absolute", top: 0, bottom: 0, right: 0, width: 3, backgroundColor: PAPER.decorative },
  factbox: { width: "100%", borderWidth: 1, borderColor: PAPER.hairline, borderTopWidth: 3, borderTopColor: PAPER.decorative, backgroundColor: PAPER.surface, padding: PAPER_SPACING.lg },
  factboxAccent: { borderTopColor: PAPER.accent },
  factboxTitle: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.ink, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: "uppercase", paddingBottom: PAPER_SPACING.sm },
  accentText: { color: PAPER.accent },
  factboxBody: { width: "100%" },
  indexBox: { width: "100%", borderWidth: 1, borderColor: PAPER.hairline, borderTopWidth: 3, borderTopColor: PAPER.decorative, backgroundColor: PAPER.surface, padding: PAPER_SPACING.md },
  indexTitle: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.accent, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: "uppercase", paddingBottom: PAPER_SPACING.sm, borderBottomWidth: 1, borderBottomColor: PAPER.hairline },
  indexRow: { flexDirection: "row", alignItems: "baseline", gap: PAPER_SPACING.xs, paddingVertical: PAPER_SPACING.xs, borderBottomWidth: 1, borderBottomColor: PAPER.hairline },
  indexLastRow: { borderBottomWidth: 0 },
  indexPage: { width: 26, fontFamily: PAPER_FONTS.metaBold, color: PAPER.secondary, fontSize: 10 },
  indexSection: { width: 58, fontFamily: PAPER_FONTS.metaMedium, color: PAPER.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 },
  indexHeadline: { flex: 1, fontFamily: PAPER_FONTS.body, color: PAPER.body, fontSize: 13, lineHeight: 17 },
  field: { width: "100%", marginBottom: PAPER_SPACING.lg },
  fieldLabel: { fontFamily: PAPER_FONTS.metaBold, color: PAPER.secondary, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase", marginBottom: PAPER_SPACING.xs },
  input: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: PAPER.hairline, color: PAPER.ink, fontFamily: PAPER_FONTS.body, fontSize: 17, paddingHorizontal: 0, paddingVertical: PAPER_SPACING.sm },
  fieldHint: { marginTop: PAPER_SPACING.xs, color: PAPER.muted, fontFamily: PAPER_FONTS.meta, fontSize: 11, lineHeight: 16 },
  errorText: { marginTop: PAPER_SPACING.xs, color: PAPER.accent, fontFamily: PAPER_FONTS.metaMedium, fontSize: 12 },
  button: { minHeight: 46, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: PAPER_SPACING.lg, paddingVertical: PAPER_SPACING.sm },
  buttonText: { fontFamily: PAPER_FONTS.metaBold, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
  disabledButton: { opacity: 0.45 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(26,26,26,0.28)" },
  drawer: { maxHeight: "90%", backgroundColor: PAPER.page, borderTopWidth: 3, borderTopColor: PAPER.decorative, paddingHorizontal: PAPER_SPACING.lg, paddingBottom: PAPER_SPACING.xl, paddingTop: PAPER_SPACING.sm },
  drawerHandle: { width: 44, height: 3, alignSelf: "center", backgroundColor: PAPER.hairline, marginBottom: PAPER_SPACING.lg },
});

export const NewspaperIcons = { settings: <Feather name="settings" size={18} color={PAPER.ink} /> };
