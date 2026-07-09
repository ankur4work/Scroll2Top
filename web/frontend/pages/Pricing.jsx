import React, { useEffect, useMemo, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  Frame,
  Icon,
  Banner,
  Stack,
  SkeletonPage,
  SkeletonBodyText,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { CircleTickMinor, CancelSmallMinor } from "@shopify/polaris-icons";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useAuthenticatedFetch } from "../hooks";

export default function Pricing() {
  const app = useAppBridge();
  const fetchAuth = useAuthenticatedFetch();
  const redirect = Redirect.create(app);

  const tick = useMemo(
    () => <Icon source={CircleTickMinor} color="success" />,
    []
  );
  const cross = useMemo(
    () => <Icon source={CancelSmallMinor} color="subdued" />,
    []
  );

  const [serverTier, setServerTier] = useState(null);
  const [loading, setLoading] = useState({ page: true, action: null });
  const [confirm, setConfirm] = useState({
    open: false,
    target: null,
    title: "",
    message: "",
  });
  const [banner, setBanner] = useState({ msg: "", status: null });

  const planPrices = {
    free: "0.00",
    basic: "10.00",
    premium: "100.00",
  };

  // Map backend tiers ➜ UI plans
  const selectedPlan = useMemo(() => {
    if (!serverTier) return null;
    if (serverTier === "free") return "free";
    if (serverTier === "premium") return "basic";
    if (serverTier === "unlimited") return "premium";
    return "free";
  }, [serverTier]);

  // Load current tier from backend
  async function refreshTier() {
    try {
      setLoading((s) => ({ ...s, page: true }));
      const res = await fetchAuth("/api/hasActiveSubscription");
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch subscription");
      }

      if (["free", "premium", "unlimited"].includes(data?.tier)) {
        setServerTier(data.tier);
      } else {
        setServerTier(data?.hasActiveSubscription ? "premium" : "free");
      }
    } catch (e) {
      console.error(e);
      setServerTier("free");
      setBanner({
        msg: "We couldn’t load your subscription details. Showing Free plan.",
        status: "critical",
      });
    } finally {
      setLoading((s) => ({ ...s, page: false }));
    }
  }

  useEffect(() => {
    refreshTier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelOf = (plan) =>
    plan === "free" ? "Free" : plan === "basic" ? "Basic" : "Premium";

  const openConfirm = (targetPlan) => {
    if (targetPlan === selectedPlan) {
      setBanner({
        msg: `You’re already using the ${labelOf(targetPlan)} plan.`,
        status: "warning",
      });
      return;
    }

    if (targetPlan === "free") {
      setConfirm({
        open: true,
        target: "free",
        title: "Move to the Free plan?",
        message:
          "This will cancel your paid subscription and switch you back to the Free tier. Advanced customization and visibility controls will be turned off.",
      });
      return;
    }

    const title =
      targetPlan === "basic" ? "Switch to Basic?" : "Upgrade to Premium?";
    const message =
      targetPlan === "basic"
        ? "The Basic plan lets you customize the button’s look and feel (colors, hover state, icon style) while keeping it visible on the homepage."
        : "The Premium plan unlocks every option — customize the button and show it on home, product, collection, and content pages across your store.";

    setConfirm({
      open: true,
      target: targetPlan,
      title,
      message,
    });
  };

  const runConfirm = async () => {
    const target = confirm.target;
    setConfirm((c) => ({ ...c, open: false }));
    await changePlan(target);
  };

  const changePlan = async (targetPlan) => {
    if (!targetPlan) return;

    try {
      setLoading((s) => ({ ...s, action: targetPlan }));

      // Downgrade to Free
      if (targetPlan === "free") {
        const res = await fetchAuth("/api/cancelSubscription");
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data?.error || "Cancel failed");

        if (data?.status && data?.status !== "No subscription found") {
          setBanner({
            msg: "Your subscription has been cancelled. You’re now on the Free plan.",
            status: "success",
          });
        } else {
          setBanner({
            msg: "There was no active subscription to cancel.",
            status: "warning",
          });
        }

        await refreshTier();
        return;
      }

      // Map UI plan ➜ backend plan
      const backendPlan = targetPlan === "basic" ? "premium" : "unlimited";

      const res = await fetchAuth(
        `/api/createSubscription?plan=${backendPlan}`
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Create subscription failed");

      if (data?.isActiveSubscription) {
        await refreshTier();
        setBanner({
          msg: `${labelOf(targetPlan)} plan is already active on your store.`,
          status: "success",
        });
      } else if (data?.confirmationUrl) {
        setBanner({
          msg: "Redirecting you to Shopify billing to confirm the plan…",
          status: "success",
        });
        redirect.dispatch(
          Redirect.Action.REMOTE,
          String(data.confirmationUrl)
        );
      } else {
        throw new Error("No confirmation URL returned from billing.");
      }
    } catch (e) {
      console.error(e);
      setBanner({
        msg:
          targetPlan === "free"
            ? "We couldn’t cancel your subscription. Please try again."
            : "We couldn’t start the subscription. Please try again.",
        status: "critical",
      });
    } finally {
      setLoading((s) => ({ ...s, action: null }));
    }
  };

  const isCurrent = (plan) => selectedPlan === plan;

  const Feature = ({ enabled, children }) => (
    <Stack spacing="tight" alignment="center">
      {enabled ? tick : cross}
      <span style={{ color: "#111827", fontSize: 14 }}>{children}</span>
    </Stack>
  );

  // Loading skeleton while first fetch is in progress
  if (loading.page && !selectedPlan) {
    return (
      <Frame>
        <SkeletonPage title="Plans & billing" primaryAction>
          <Layout>
            {[1, 2, 3].map((k) => (
              <Layout.Section oneThird key={k}>
                <Card sectioned>
                  <SkeletonBodyText lines={6} />
                </Card>
              </Layout.Section>
            ))}
          </Layout>
        </SkeletonPage>
      </Frame>
    );
  }

  // Shared card styles
  const commonCardStyle = {
    borderRadius: 18,
    border: "1px solid #E5E7EB",
    position: "relative",
    overflow: "hidden",
    paddingTop: 0,
    boxShadow: "0 4px 14px rgba(15,23,42,0.06)", // base subtle shadow
    transition: "all 0.18s ease",
    backgroundColor: "#FFFFFF",
  };

  const glowIfCurrent = (plan) =>
    isCurrent(plan)
      ? {
          boxShadow: "0 18px 45px rgba(37,99,235,0.22)", // stronger glow
          border: "2px solid #2563EB",
          transform: "translateY(-4px)",
        }
      : {};

  const FreeWatermark = () => (
    <div
      style={{
        position: "absolute",
        top: "46%",
        left: "-12%",
        transform: "rotate(-30deg)",
        fontSize: "40px",
        color: "rgba(15,23,42,0.04)",
        fontWeight: 700,
        pointerEvents: "none",
        userSelect: "none",
        textTransform: "uppercase",
      }}
    >
      Free plan
    </div>
  );

  const pillBase = {
    borderRadius: 999,
    padding: "3px 12px",
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const badgeStarter = {
    ...pillBase,
    backgroundColor: "#047857",
    color: "#FFFFFF",
  };

  const badgePopular = {
    ...pillBase,
    backgroundColor: "#FB923C",
    color: "#111827",
  };

  const badgeFull = {
    ...pillBase,
    backgroundColor: "#7C3AED",
    color: "#F9FAFB",
  };

  const badgeCurrent = {
    ...pillBase,
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
  };

  const getAccentColor = (plan) => {
    if (plan === "free") return "#047857";
    if (plan === "basic") return "#F97316";
    return "#7C3AED";
  };

  const cardInner = {
    padding: "16px 18px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const headerRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  };

  const priceRow = {
    marginTop: 6,
    marginBottom: 4,
  };

  const featureBlock = {
    marginTop: 10,
    marginBottom: 12,
  };

  const buttonRow = {
    marginTop: 8,
    display: "flex",
    justifyContent: "center",
  };

  return (
    <Frame>
      {/* Confirm modal */}
      <Modal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        title={confirm.title}
        primaryAction={{
          content:
            confirm.target === "free"
              ? "Yes, switch to Free"
              : `Subscribe for $${planPrices[confirm.target]} / month`,
          onAction: runConfirm,
          loading: loading.action === confirm.target,
          destructive: confirm.target === "free",
        }}
        secondaryActions={[
          {
            content: "Go back",
            onAction: () => setConfirm((c) => ({ ...c, open: false })),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>{confirm.message}</p>
          </TextContainer>
        </Modal.Section>
      </Modal>

      <Page
        title="Scroll-2-Top – Plans & billing"
        subtitle="Pick the plan that matches how far you want your scroll button to go."
      >
        {!!banner.msg && !!banner.status && (
          <div style={{ marginBottom: 12 }}>
            <Banner
              status={banner.status}
              onDismiss={() => setBanner({ msg: "", status: null })}
            >
              {banner.msg}
            </Banner>
          </div>
        )}

        <Layout>
          {/* FREE PLAN */}
          <Layout.Section oneThird>
            <Card
              sectioned={false}
              title={null}
              style={{ ...commonCardStyle, ...glowIfCurrent("free") }}
            >
              {/* Accent bar */}
              <div
                style={{
                  height: 6,
                  width: "100%",
                  background: getAccentColor("free"),
                }}
              />
              <FreeWatermark />

              <div style={cardInner}>
                <div style={headerRow}>
                  <Stack alignment="center" spacing="tight">
                    <span style={{ fontWeight: 600 }}>Free</span>
                    <span style={badgeStarter}>Good to start</span>
                  </Stack>
                  {isCurrent("free") && (
                    <span style={badgeCurrent}>Current</span>
                  )}
                </div>

                <div style={priceRow}>
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    $0
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>
                    Ideal for trying out Scroll-2-Top
                  </div>
                </div>

                <p style={{ color: "var(--p-text-subdued)", fontSize: 13 }}>
                  Add a basic Scroll-2-Top button with smooth scrolling. Styling
                  is fixed and the button appears on the homepage only.
                </p>

                <div style={featureBlock}>
                  <Stack vertical spacing="loose">
                    <Feature enabled={true}>
                      Smooth scroll-to-top animation
                    </Feature>
                    <Feature enabled={false}>Change button color or icon</Feature>
                    <Feature enabled={false}>Custom hover appearance</Feature>
                    <Feature enabled={false}>
                      Show on product or collection pages
                    </Feature>
                    <Feature enabled={true}>
                      Works on mobile and desktop
                    </Feature>
                  </Stack>
                </div>

                <div style={buttonRow}>
                  <Button
                    destructive
                    onClick={() => openConfirm("free")}
                    disabled={isCurrent("free") || loading.action === "free"}
                    loading={loading.action === "free"}
                    fullWidth
                  >
                    {isCurrent("free") ? "Current plan" : "Switch to Free"}
                  </Button>
                </div>
              </div>
            </Card>
          </Layout.Section>

          {/* BASIC PLAN */}
          <Layout.Section oneThird>
            <Card
              sectioned={false}
              title={null}
              style={{
                ...commonCardStyle,
                ...glowIfCurrent("basic"),
                background:
                  "linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 45%, #FFFFFF 100%)",
              }}
            >
              {/* Accent bar */}
              <div
                style={{
                  height: 6,
                  width: "100%",
                  background: getAccentColor("basic"),
                }}
              />

              <div style={cardInner}>
                <div style={headerRow}>
                  <Stack alignment="center" spacing="tight">
                    <span style={{ fontWeight: 600 }}>Basic</span>
                    <span style={badgePopular}>Most chosen</span>
                  </Stack>
                  {isCurrent("basic") && (
                    <span style={badgeCurrent}>Current</span>
                  )}
                </div>

                <div style={priceRow}>
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    $10
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>
                    Best for custom branded scroll buttons
                  </div>
                </div>

                <p style={{ color: "var(--p-text-subdued)", fontSize: 13 }}>
                  Unlock design controls for the Scroll-2-Top button. Adjust
                  colors, hover styles, and icon while keeping it active on your
                  homepage.
                </p>

                <div style={featureBlock}>
                  <Stack vertical spacing="loose">
                    <Feature enabled={true}>
                      Smooth scroll-to-top animation
                    </Feature>
                    <Feature enabled={true}>
                      Custom colors and icon style
                    </Feature>
                    <Feature enabled={true}>
                      Hover effects and visual feedback
                    </Feature>
                    <Feature enabled={false}>
                      Show on collection or product pages
                    </Feature>
                    <Feature enabled={true}>
                      Mobile-friendly experience
                    </Feature>
                  </Stack>
                </div>

                <div style={buttonRow}>
                  <Button
                    primary
                    onClick={() => openConfirm("basic")}
                    disabled={isCurrent("basic") || loading.action === "basic"}
                    loading={loading.action === "basic"}
                    fullWidth
                  >
                    {isCurrent("basic") ? "Basic active" : "Upgrade to Basic"}
                  </Button>
                </div>
              </div>
            </Card>
          </Layout.Section>

          {/* PREMIUM PLAN */}
          <Layout.Section oneThird>
            <Card
              sectioned={false}
              title={null}
              style={{
                ...commonCardStyle,
                ...glowIfCurrent("premium"),
              }}
            >
              {/* Accent bar */}
              <div
                style={{
                  height: 6,
                  width: "100%",
                  background: getAccentColor("premium"),
                }}
              />

              <div style={cardInner}>
                <div style={headerRow}>
                  <Stack alignment="center" spacing="tight">
                    <span style={{ fontWeight: 600 }}>Premium</span>
                    <span style={badgeFull}>All features</span>
                  </Stack>
                  {isCurrent("premium") && (
                    <span style={badgeCurrent}>Current</span>
                  )}
                </div>

                <div style={priceRow}>
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    $100
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>
                    Full control and visibility across your store
                  </div>
                </div>

                <p style={{ color: "var(--p-text-subdued)", fontSize: 13 }}>
                  Get full control of Scroll-2-Top — customize the button and
                  display it across all key pages, including home, product, and
                  collection.
                </p>

                <div style={featureBlock}>
                  <Stack vertical spacing="loose">
                    <Feature enabled={true}>
                      Smooth scroll-to-top animation
                    </Feature>
                    <Feature enabled={true}>
                      Advanced styling (colors & icon)
                    </Feature>
                    <Feature enabled={true}>
                      Hover and interaction control
                    </Feature>
                    <Feature enabled={true}>
                      Visibility on all key storefront pages
                    </Feature>
                    <Feature enabled={true}>
                      Optimized for speed and mobile
                    </Feature>
                  </Stack>
                </div>

                <div style={buttonRow}>
                  <Button
                    primary
                    onClick={() => openConfirm("premium")}
                    disabled={isCurrent("premium") || loading.action === "premium"}
                    loading={loading.action === "premium"}
                    fullWidth
                  >
                    {isCurrent("premium") ? "Premium active" : "Upgrade to Premium"}
                  </Button>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
