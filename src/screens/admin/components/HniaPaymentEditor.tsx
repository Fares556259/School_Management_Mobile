import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface HniaPaymentReview {
  type: "student" | "teacher" | "overtime";
  beneficiary: string;
  choices?: Array<{
    key: string;
    kind: string;
    label: string;
    period: string;
    due: number;
  }>;
  baseSalary?: number;
  deduction?: number;
  overtimeHours?: number;
  hourlyAmount?: number;
  fixedAmount?: number;
  amountPaid?: number;
  remaining?: number;
}
const num = (value: string, maxDecimals = 3) => {
  if (!new RegExp(`^\\d+(?:[.,]\\d{1,${maxDecimals}})?$`).test(value.trim()))
    return NaN;
  const n = Number(value.replace(",", "."));
  return n > 0 && n <= 1000000 ? n : NaN;
};
export default function HniaPaymentEditor({
  review,
  args,
  language,
  onClose,
  onReview,
}: {
  review: HniaPaymentReview;
  args: Record<string, any>;
  language: string;
  onClose: () => void;
  onReview: (args: Record<string, any>) => void;
}) {
  const tx = (fr: string, en: string, ar: string) =>
    language === "ar" ? ar : language === "en" ? en : fr;
  const insets = useSafeAreaInsets();
  const choices = review.choices || [];
  const [kind, setKind] = useState<string>(
    args.items?.[0]?.kind || choices[0]?.kind || "TUITION",
  );
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (args.items || []).map((i: any) => [
        `${i.kind}:${i.period}`,
        String(i.amount),
      ]),
    ),
  );
  const [amount, setAmount] = useState(String(args.amount ?? ""));
  const [hours, setHours] = useState(String(args.hours ?? ""));
  const [rate, setRate] = useState(String(args.rate ?? ""));
  const [mode, setMode] = useState(args.mode || "hourly");
  const [month, setMonth] = useState(String(args.month ?? ""));
  const [year, setYear] = useState(String(args.year ?? ""));
  const [advance, setAdvance] = useState(Boolean(args.isAdvance));
  const [method, setMethod] = useState(args.paymentMethod || "Espèces");
  const [paidOn, setPaidOn] = useState(args.paidOn || "");
  const [error, setError] = useState("");
  const money = (n: number) =>
    n.toLocaleString(
      language === "ar" ? "ar-TN" : language === "en" ? "en-GB" : "fr-FR",
      { maximumFractionDigits: 3 },
    );
  const kindName = (k: string, fallback: string) =>
    (
      ({
        TUITION: tx("Scolarité", "Tuition", "الدراسة"),
        REGISTRATION: tx("Inscription", "Registration", "التسجيل"),
        TRANSPORT: tx("Transport", "Bus", "النقل"),
        GARDE: tx("Garde", "After-school care", "الحضانة"),
      }) as Record<string, string>
    )[k] || fallback;
  const periods = (p: string) =>
    /^\d{4}-\d{2}$/.test(p)
      ? new Date(
          Number(p.slice(0, 4)),
          Number(p.slice(5)) - 1,
          1,
        ).toLocaleDateString(
          language === "ar" ? "ar-TN" : language === "en" ? "en-GB" : "fr-FR",
          { month: "long", year: "numeric" },
        )
      : p;
  const total =
    review.type === "student"
      ? Object.values(selected).reduce(
          (sum, v) => sum + (Number.isFinite(num(v)) ? num(v) : 0),
          0,
        )
      : review.type === "overtime" && mode === "hourly"
        ? (num(hours, 2) || 0) * (num(rate) || 0)
        : num(amount) || 0;
  const submit = () => {
    try {
      let edits: Record<string, any>;
      if (review.type === "student") {
        const items = Object.entries(selected).map(([key, value]) => {
          const choice = choices.find((c) => c.key === key),
            parsed = num(value);
          if (!choice || !Number.isFinite(parsed) || parsed > choice.due)
            throw new Error(
              tx(
                "Vérifiez les montants : chaque ligne doit être positive et ne pas dépasser son solde.",
                "Check each amount: it must be positive and within the balance.",
                "تحقق من المبالغ: يجب أن تكون موجبة وألا تتجاوز الرصيد.",
              ),
            );
          return { kind: choice.kind, period: choice.period, amount: parsed };
        });
        if (!items.length)
          throw new Error(
            tx(
              "Choisissez au moins un mois ou un service.",
              "Choose at least one month or service.",
              "اختر شهراً أو خدمة واحدة على الأقل.",
            ),
          );
        edits = { items, paymentMethod: method, paidOn };
      } else {
        if (
          !Number.isInteger(Number(month)) ||
          Number(month) < 1 ||
          Number(month) > 12 ||
          !/^\d{4}$/.test(year)
        )
          throw new Error(
            tx(
              "Vérifiez le mois et l’année.",
              "Check the month and year.",
              "تحقق من الشهر والسنة.",
            ),
          );
        edits = { month: Number(month), year: Number(year) };
        if (review.type === "overtime" && mode === "hourly") {
          if (
            !Number.isFinite(num(hours, 2)) ||
            num(hours, 2) > 744 ||
            !Number.isFinite(num(rate))
          )
            throw new Error(
              tx(
                "Vérifiez les heures et le taux horaire.",
                "Check hours and hourly rate.",
                "تحقق من الساعات وأجر الساعة.",
              ),
            );
          Object.assign(edits, { mode, hours: num(hours, 2), rate: num(rate) });
        } else {
          if (!Number.isFinite(num(amount)))
            throw new Error(
              tx(
                "Indiquez un montant positif (3 décimales maximum).",
                "Enter a positive amount (up to 3 decimals).",
                "أدخل مبلغاً موجباً بثلاث منازل عشرية كحد أقصى.",
              ),
            );
          Object.assign(
            edits,
            { amount: num(amount) },
            review.type === "overtime"
              ? { mode: "fixed" }
              : { isAdvance: advance },
          );
        }
      }
      // Editing always requests a new server review, never executes the payment.
      onReview(edits);
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const input = (
    label: string,
    value: string,
    change: (v: string) => void,
    keyboard: "decimal-pad" | "number-pad" | "default" = "decimal-pad",
  ) => (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.input}
        value={value}
        onChangeText={change}
        keyboardType={keyboard}
      />
    </View>
  );
  const chip = (
    label: string,
    active: boolean,
    onPress: () => void,
    key = label,
  ) => (
    <TouchableOpacity
      key={key}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.active]}
    >
      <Text style={[styles.chipText, active && styles.activeText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              direction: language === "ar" ? "rtl" : "ltr",
            },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {tx("Modifier le paiement", "Edit payment", "تعديل الدفعة")}
              </Text>
              <Text style={styles.subtitle}>{review.beneficiary}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel={tx("Fermer", "Close", "إغلاق")}
              style={styles.close}
            >
              <Text>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {review.type === "student" ? (
              <>
                <Text style={styles.label}>
                  {tx(
                    "Que règle la famille ?",
                    "What is the family paying?",
                    "ما الذي تدفعه العائلة؟",
                  )}
                </Text>
                <ScrollView
                  horizontal
                  style={{ flexGrow: 0 }}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.row}
                >
                  {Array.from(
                    new Map(choices.map((c) => [c.kind, c.label])),
                  ).map(([k, label]) =>
                    chip(kindName(k, label), kind === k, () => setKind(k), k),
                  )}
                </ScrollView>
                {choices
                  .filter((c) => c.kind === kind)
                  .map((choice) => (
                    <View
                      key={choice.key}
                      style={[
                        styles.choice,
                        selected[choice.key] !== undefined && styles.chosen,
                      ]}
                    >
                      <TouchableOpacity
                        accessibilityRole="checkbox"
                        accessibilityLabel={`${kindName(choice.kind, choice.label)} ${choice.period}`}
                        accessibilityState={{
                          checked: selected[choice.key] !== undefined,
                        }}
                        style={styles.choiceHeader}
                        onPress={() =>
                          setSelected((prev) => {
                            const next = { ...prev };
                            if (next[choice.key] !== undefined)
                              delete next[choice.key];
                            else next[choice.key] = String(choice.due);
                            return next;
                          })
                        }
                      >
                        <Text style={styles.checkbox}>
                          {selected[choice.key] !== undefined ? "☑" : "☐"}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.choiceTitle}>
                            {periods(choice.period)}
                          </Text>
                          <Text style={styles.subtitle}>
                            {tx("Reste", "Remaining", "المتبقي")}{" "}
                            {money(choice.due)} TND
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {selected[choice.key] !== undefined &&
                        input(
                          tx(
                            "Montant reçu",
                            "Amount received",
                            "المبلغ المستلم",
                          ) +
                            " · " +
                            choice.period,
                          selected[choice.key],
                          (v) =>
                            setSelected((prev) => ({
                              ...prev,
                              [choice.key]: v,
                            })),
                        )}
                    </View>
                  ))}
                {!choices.length && (
                  <Text>
                    {tx(
                      "Aucun montant à encaisser.",
                      "No balance to collect.",
                      "لا يوجد مبلغ مستحق.",
                    )}
                  </Text>
                )}
                <Text style={styles.label}>
                  {tx("Mode de règlement", "Payment method", "طريقة الدفع")}
                </Text>
                <View style={styles.wrap}>
                  {["Espèces", "Chèque", "Virement", "Carte"].map((m) =>
                    chip(
                      (
                        {
                          Espèces: tx("Espèces", "Cash", "نقداً"),
                          Chèque: tx("Chèque", "Cheque", "شيك"),
                          Virement: tx("Virement", "Transfer", "تحويل"),
                          Carte: tx("Carte", "Card", "بطاقة"),
                        } as Record<string, string>
                      )[m],
                      method === m,
                      () => setMethod(m),
                      m,
                    ),
                  )}
                </View>
                {input(
                  tx(
                    "Date effective · AAAA-MM-JJ",
                    "Payment date · YYYY-MM-DD",
                    "تاريخ الدفع · YYYY-MM-DD",
                  ),
                  paidOn,
                  setPaidOn,
                  "default",
                )}
              </>
            ) : (
              <>
                <View style={styles.row}>
                  {input(
                    tx("Mois (1–12)", "Month (1–12)", "الشهر (1–12)"),
                    month,
                    setMonth,
                    "number-pad",
                  )}
                  {input(
                    tx("Année", "Year", "السنة"),
                    year,
                    setYear,
                    "number-pad",
                  )}
                </View>
                {review.type === "overtime" ? (
                  <>
                    <View style={styles.wrap}>
                      {chip(
                        tx("Heures × taux", "Hours × rate", "الساعات × الأجر"),
                        mode === "hourly",
                        () => setMode("hourly"),
                      )}
                      {chip(
                        tx("Montant forfaitaire", "Fixed amount", "مبلغ ثابت"),
                        mode === "fixed",
                        () => setMode("fixed"),
                      )}
                    </View>
                    {mode === "hourly" ? (
                      <View style={styles.row}>
                        {input(
                          tx(
                            "Heures à ajouter",
                            "Hours to add",
                            "الساعات المضافة",
                          ),
                          hours,
                          setHours,
                        )}
                        {input(
                          tx(
                            "Taux · TND/h",
                            "Rate · TND/h",
                            "أجر الساعة · د.ت",
                          ),
                          rate,
                          setRate,
                        )}
                      </View>
                    ) : (
                      input(
                        tx(
                          "Montant à ajouter · TND",
                          "Amount to add · TND",
                          "المبلغ المضاف · د.ت",
                        ),
                        amount,
                        setAmount,
                      )
                    )}
                    <Text style={styles.subtitle}>
                      {tx(
                        "Cet ajout ne verse aucun salaire.",
                        "This addition does not pay the salary.",
                        "هذه الإضافة لا تصرف الراتب.",
                      )}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.wrap}>
                      {chip(tx("Solde", "Balance", "المتبقي"), !advance, () =>
                        setAdvance(false),
                      )}
                      {chip(tx("Avance", "Advance", "سلفة"), advance, () =>
                        setAdvance(true),
                      )}
                    </View>
                    {input(
                      tx(
                        "Montant à verser · TND",
                        "Amount to pay · TND",
                        "المبلغ المدفوع · د.ت",
                      ),
                      amount,
                      setAmount,
                    )}
                    <Text style={styles.subtitle}>
                      {tx(
                        "Solde vérifié",
                        "Verified balance",
                        "الرصيد المراجع",
                      )}{" "}
                      : {money(review.remaining || 0)} TND
                    </Text>
                  </>
                )}
              </>
            )}
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.label}>
                {tx("Total sélectionné", "Selected total", "الإجمالي المحدد")}
              </Text>
              <Text style={styles.total}>
                {money(Math.round(total * 1000) / 1000)} TND
              </Text>
            </View>
            <Text style={styles.subtitle}>
              {tx(
                "Vérifiez la nouvelle carte, puis confirmez.",
                "Review the updated card, then confirm.",
                "راجع البطاقة المحدّثة ثم أكّد.",
              )}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={submit}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {tx(
                  "Vérifier les modifications",
                  "Review changes",
                  "مراجعة التعديلات",
                )}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0f172a66",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: { fontSize: 19, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 12, lineHeight: 18, color: "#64748b" },
  close: { padding: 12, borderRadius: 12, backgroundColor: "#f1f5f9" },
  body: { padding: 20, gap: 14 },
  row: { flexDirection: "row", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  active: { borderColor: "#0055d4", backgroundColor: "#eff6ff" },
  chipText: { fontSize: 13, color: "#475569" },
  activeText: { color: "#0055d4", fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", color: "#475569" },
  inputWrap: { flex: 1, gap: 6, minWidth: 70 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  choice: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  chosen: { borderColor: "#0055d4", backgroundColor: "#f8fbff" },
  choiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: { fontSize: 23, color: "#0055d4" },
  choiceTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  total: { fontSize: 21, fontWeight: "700", color: "#0f172a" },
  button: {
    backgroundColor: "#0055d4",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  error: { fontSize: 13, color: "#be123c" },
});
