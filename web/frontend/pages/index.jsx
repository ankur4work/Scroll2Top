// @ts-check
import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Button,
  Modal,
  Frame,
  TopBar,
  CalloutCard,
  DisplayText,
  Toast,
  SkeletonBodyText,
  Banner,
  Stack,
  ButtonGroup,
  Badge,
} from "@shopify/polaris";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";
import { useNavigate } from "react-router-dom";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { shopifyBackground } from "../assets";

export default function HomePage() {
  const emptyToastProps = { content: null };
  const [toastProps, setToastProps] = useState(emptyToastProps);
  const [selectedPlan, setSelectedPlan] = useState("free"); // default Free
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [confirmPlan, setConfirmPlan] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activateError, setActivateError] = useState(null);
  const [videoModalActive, setVideoModalActive] = useState(false);

  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const redirect = Redirect.create(app);
  const navigate = useNavigate();

  const toggleVideoModal = useCallback(
    () => setVideoModalActive((active) => !active),
    []
  );

  // --- Prices map ---
  const planPrices = {
    basic: "10.00",
    premium: "100.00",
  };

  const planLabels = {
    free: "Free",
    basic: "Basic",
    premium: "Premium",
  };

  // Fetch current plan
  const { data: subscriptionData, isLoading } = useAppQuery({
    url: "/api/hasActiveSubscription",
  });

  useEffect(() => {
    if (subscriptionData && subscriptionData.tier) {
      // Map backend tiers → frontend tiers
      let frontendTier = "free";
      if (subscriptionData.tier === "premium") frontendTier = "basic";
      if (subscriptionData.tier === "unlimited") frontendTier = "premium";
      setSelectedPlan(frontendTier);
    }
  }, [subscriptionData]);

  // --- Handle plan click ---
  const requestPlanChange = (plan) => {
    setConfirmPlan(plan);
    setShowConfirm(true);
  };

  const confirmSubscription = async () => {
    if (!confirmPlan) return;

    // Case 1: Already on this plan
    if (selectedPlan === confirmPlan) {
      setToastProps({ content: `You’re already using the ${planLabels[confirmPlan]} plan ✅` });
      setShowConfirm(false);
      return;
    }

    // Case 2: Switching to free (cancel subscription)
    if (confirmPlan === "free") {
      setLoadingPlan(confirmPlan);
      try {
        const res = await fetch("/api/cancelSubscription");
        const data = await res.json();

        if (data.status && data.status !== "No subscription found") {
          setSelectedPlan("free");
          setToastProps({
            content: "Subscription cancelled and moved to the Free plan ✅",
          });
        } else {
          setToastProps({ content: "Unable to cancel the subscription", error: true });
        }
      } catch (err) {
        setToastProps({ content: "Cancellation failed ❌", error: true });
      } finally {
        setLoadingPlan(null);
        setShowConfirm(false);
      }
      return;
    }

    // Case 3: Switching to paid plan
    setLoadingPlan(confirmPlan);

    // Map frontend → backend values
    let backendPlan = confirmPlan;
    if (confirmPlan === "basic") backendPlan = "premium"; // frontend basic = backend premium
    if (confirmPlan === "premium") backendPlan = "unlimited"; // frontend premium = backend unlimited

    try {
      const res = await fetch(`/api/createSubscription?plan=${backendPlan}`);
      const data = await res.json();
      if (data.confirmationUrl) {
        setToastProps({ content: "Taking you to Shopify billing to confirm…" });
        redirect.dispatch(Redirect.Action.REMOTE, data.confirmationUrl);
      } else if (data.error) {
        setToastProps({ content: data.error, error: true });
      }
    } catch (err) {
      setToastProps({ content: "Something went wrong during subscription ❌", error: true });
    } finally {
      setLoadingPlan(null);
      setShowConfirm(false);
    }
  };

  // --- Activate Scroll to Top Button (Theme Editor) ---
  const openThemeEditor = async () => {
    setActivateError(null);
    try {
      const response = await fetch("/api/getshop");
      if (!response.ok) throw new Error("Could not detect shop domain");
      const data = await response.json();
      if (!data.shop) throw new Error("Shop domain is missing");

      window.open(
        `https://${data.shop}/admin/themes/current/editor?context=apps&activateAppId=b355dba7-d415-49dc-8399-11206b10c9ca/scroll-to-top-embed`,
        "_blank"
      );
    } catch (error) {
      console.error("❌ Activate failed:", error);
      setActivateError(error.message);
    }
  };

  const toastMarkup =
    toastProps.content && (
      <Toast
        {...toastProps}
        onDismiss={() => setToastProps(emptyToastProps)}
      />
    );

  // --- Header setup ---
  const logo = {
    width: 450,
    height: 90,
    topBarSource:
      "https://cdn.shopify.com/s/files/1/0908/8562/0025/files/1_2efac025-bda0-4756-9aa2-fbe5bf1d3405.png?v=1760009662",
    url: "/",
    accessibilityLabel: "App logo",
  };

  const topBarMarkup = <TopBar />;

  const plans = ["free", "basic", "premium"];
  const currentPlanLabel = planLabels[selectedPlan] || "Free";

  // Shared wrapper style for “big sections”
  const sectionShellStyle = {
    background: "#ffffff",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb",
  };

  const sectionAccentBar = (
    <div
      style={{
        height: 4,
        width: 64,
        borderRadius: 999,
        background:
          "linear-gradient(90deg, #008060 0%, #36a3ff 50%, #ffb347 100%)",
        marginBottom: 12,
      }}
    />
  );

  return (
    <Frame topBar={topBarMarkup} logo={logo}>
      <Page>
        {toastMarkup}
        <Layout>
          {/* PLAN SELECTOR CARD */}
          <Layout.Section>
            <div style={sectionShellStyle}>
              {sectionAccentBar}
              <Card title="Your current plan" sectioned>
                {isLoading ? (
                  <div style={{ display: "flex", gap: "12px" }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ flex: 1 }}>
                        <SkeletonBodyText lines={1} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Stack vertical spacing="loose">
                    <Stack alignment="center" spacing="tight">
                      <span>Active plan:</span>
                      <Badge status="success">{currentPlanLabel}</Badge>
                    </Stack>

                    <TextContainer spacing="tight">
                      <p>
                        You can upgrade at any time to unlock additional
                        controls and faster support. All charges are processed
                        securely through Shopify Billing.
                      </p>
                    </TextContainer>

                    <ButtonGroup>
                      {plans.map((plan) => (
                        <Button
                          key={plan}
                          primary={selectedPlan === plan}
                          pressed={selectedPlan === plan}
                          loading={loadingPlan === plan}
                          onClick={() => requestPlanChange(plan)}
                        >
                          {plan === "free"
                            ? "Free"
                            : plan === "basic"
                            ? "Basic – $10/mo"
                            : "Premium – $100/mo"}
                        </Button>
                      ))}
                    </ButtonGroup>
                  </Stack>
                )}
              </Card>
            </div>
          </Layout.Section>

          {/* Confirmation Modal */}
          <Modal
            open={showConfirm}
            onClose={() => setShowConfirm(false)}
            title="Confirm plan change"
            primaryAction={{
              content:
                selectedPlan === confirmPlan
                  ? "Okay, got it"
                  : confirmPlan === "free"
                  ? "Yes, cancel my subscription"
                  : `Subscribe for $${planPrices[confirmPlan] || "0.00"}/month`,
              onAction: confirmSubscription,
              loading: loadingPlan === confirmPlan,
            }}
            secondaryActions={
              selectedPlan !== confirmPlan
                ? [{ content: "No, go back", onAction: () => setShowConfirm(false) }]
                : []
            }
          >
            <Modal.Section>
              {selectedPlan === confirmPlan ? (
                <p>
                  You’re already on the{" "}
                  <b>{(confirmPlan || "").toUpperCase()}</b> plan ✅
                </p>
              ) : confirmPlan === "free" ? (
                <p>
                  Are you sure you want to cancel your{" "}
                  <b>{selectedPlan.toUpperCase()}</b> subscription and move to the{" "}
                  <b>FREE</b> plan?
                </p>
              ) : (
                <p>
                  Do you want to switch to the{" "}
                  <b>{(confirmPlan || "").toUpperCase()}</b> plan for{" "}
                  <b>${planPrices[confirmPlan] || "0.00"}</b> per month?
                </p>
              )}
            </Modal.Section>
          </Modal>

          {/* Status Banner (if error) */}
          {activateError && (
            <Layout.Section>
              <Banner status="critical" onDismiss={() => setActivateError(null)}>
                {activateError}
              </Banner>
            </Layout.Section>
          )}

          {/* HERO INTRODUCTION CARD (text + video preview) */}
          <Layout.Section>
            <div style={sectionShellStyle}>
              {sectionAccentBar}
              <Card sectioned>
                <Stack
                  alignment="center"
                  distribution="fill"
                  wrap
                  spacing="loose"
                >
                  {/* Left side: introduction text */}
                  <div style={{ flex: 1, minWidth: 260, maxWidth: 520 }}>
                    <TextContainer spacing="tight">
                      <DisplayText size="Large">
                        <span>Welcome to Scroll to Top Button</span>
                      </DisplayText>
                      <p>
                        The Scroll to Top Button adds a clean, floating shortcut
                        that lets shoppers instantly jump back to the top of the
                        page. It keeps long pages easy to navigate and makes
                        browsing feel faster and more polished on every device.
                      </p>

                      <h2>
                        <b>Main highlights:</b>
                      </h2>
                      <ul className="appFeatures">
                        <li>
                          <strong>Smooth return-to-top motion:</strong> Delivers a
                          fluid scroll-back experience instead of a sudden jump.
                        </li>
                        <li>
                          <strong>Fully customizable styling:</strong> Tweak
                          colors, icons, and hover states to match your brand.
                        </li>
                        <li>
                          <strong>Page-level visibility rules:</strong> Decide
                          where the button should appear – collections, products,
                          blog posts, or standard pages.
                        </li>
                        <li>
                          <strong>Optimized for mobile:</strong> Looks great and
                          stays reachable on phones and tablets.
                        </li>
                        <li>
                          <strong>Lightweight implementation:</strong> Built to
                          stay fast and not slow down your storefront.
                        </li>
                      </ul>
                    </TextContainer>

                    <div style={{ marginTop: 20 }}>
                      <Button onClick={toggleVideoModal} primary>
                        Watch quick setup guide ▶️
                      </Button>
                    </div>
                  </div>

                  {/* Right side: phone / video preview */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 260,
                      maxWidth: 320,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        overflow: "hidden",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                        backgroundImage: `url(${shopifyBackground})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        padding: 18,
                      }}
                    >
                      <video
                        src="https://cdn.shopify.com/videos/c/o/v/3b1a1e7263994b299f3af4f19630ef5f.mp4"
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 8,
                          display: "block",
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>
                </Stack>
              </Card>
            </div>
          </Layout.Section>

          {/* Scroll to Top Callout */}
          <Layout.Section>
            <div style={sectionShellStyle}>
              {sectionAccentBar}
              <CalloutCard
                title="Enable the app embed to start using the button"
                illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
                primaryAction={{
                  content: "Open theme editor",
                  onAction: openThemeEditor,
                  accessibilityLabel: "Enable the Scroll to Top app embed",
                }}
              >
                <p>
                  To make the Scroll to Top button appear on your storefront, turn
                  on the app embed inside your current theme. Once it’s enabled,
                  you can fine-tune placement, styling, and visibility directly in
                  the theme editor.
                </p>
              </CalloutCard>
            </div>
          </Layout.Section>

          {/* Setup Video Modal (full-screen) */}
          <Modal
            open={videoModalActive}
            onClose={toggleVideoModal}
            title="Quick setup in Online Store 2.0"
          >
            <Modal.Section>
              <div style={{ padding: "56% 0 0 0", position: "relative" }}>
                <iframe
                  src="https://cdn.shopify.com/videos/c/o/v/bd24b7a578304e96a9fcfaaf27fabdc0.mp4"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "50%",
                  }}
                  title="Quick Setup"
                ></iframe>
              </div>
            </Modal.Section>
          </Modal>
        </Layout>
      </Page>
    </Frame>
  );
}
