import {
  FOOTER_MARKER,
  LEAD_FORM_MARKER,
  LAYOUT_MARKER,
  STRUCTURE_MARKER,
} from "./landingHtmlPostprocessMarkers.js";
import type { LandingLayoutMode } from "./landingHtmlPostprocessTypes.js";
import { LANDING_CONTENT_WIDTH } from "./landingHtmlPostprocessTypes.js";

const LANDING_ROOT_VARS = `:root {
  --landing-content-max: calc(100% - 2rem);
}
@media (min-width: 1025px) {
  :root {
    --landing-content-max: min(80rem, calc(100% - 2rem));
  }
}
@media (min-width: 1601px) {
  :root {
    --landing-content-max: min(92rem, calc(100% - 2rem));
  }
}
`;

const FOOTER_ICON_SVG_FIX = `
footer,
section.footer,
section#footer,
[data-lp="footer"] {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: clamp(1rem, 2.5vw, 1.5rem) !important;
  width: 100% !important;
  box-sizing: border-box;
}
section.footer form,
section.footer .form,
section[class*="footer" i] form,
section[class*="footer" i] .form,
[data-lp="footer"] form,
[data-lp="footer"] .form {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 0.75rem !important;
  width: 100% !important;
  max-width: min(28rem, 100%) !important;
  margin-left: auto !important;
  margin-right: auto !important;
  text-align: left;
  box-sizing: border-box;
}
section.footer address,
section[class*="footer" i] address,
[data-lp="footer"] address {
  text-align: center;
  margin: 0.5rem auto 0;
  max-width: 100%;
}
footer .social-icons,
section.footer .social-icons,
section[class*="footer" i] .social-icons,
section#footer .social-icons,
[data-lp="footer"] .social-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 100%;
}
footer .social-icons a,
section.footer .social-icons a,
section[class*="footer" i] .social-icons a,
[data-lp="footer"] .social-icons a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  color: inherit;
  opacity: 0.95;
}
footer svg,
section.footer svg,
section[class*="footer" i] svg,
section#footer svg,
[data-lp="footer"] svg {
  width: 2.25rem !important;
  height: 2.25rem !important;
  max-width: 2.75rem;
  max-height: 2.75rem;
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  fill: currentColor;
}
footer svg.social-icon-stroke,
section.footer svg.social-icon-stroke,
section[class*="footer" i] svg.social-icon-stroke,
section#footer svg.social-icon-stroke,
[data-lp="footer"] svg.social-icon-stroke {
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 1.65;
  stroke-linecap: round;
  stroke-linejoin: round;
}
`;
export const FOOTER_STYLE = `<style ${FOOTER_MARKER}="1">
html, body { min-height: 100%; max-width: 100%; overflow-x: hidden; }
body { min-height: 100vh; display: flex; flex-direction: column; width: 100%; }
footer { position: static; margin-top: auto; width: 100%; }
</style>`;

export const LAYOUT_STYLE = `<style ${LAYOUT_MARKER}="1">
header, nav { width: 100%; }
</style>`;

export const STRUCTURE_STYLE_MINIMAL = `<style ${STRUCTURE_MARKER}="1">
${LANDING_ROOT_VARS}
html, body { max-width: 100%; overflow-x: hidden; }
main, section { box-sizing: border-box; }
section {
  padding-block: clamp(1.75rem, 3.5vw, 3.75rem);
  padding-inline: clamp(1rem, 3vw, 1.5rem);
}
section > * + * {
  margin-top: clamp(0.75rem, 1.8vw, 1.25rem);
}
main section + section,
body > main > section + section,
body > section + section {
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}
section .cards, section .grid, section .services, section .reviews, section .benefits, section .process {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
  gap: 1rem;
}
section ul:not(nav ul):not(header ul) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: .85rem;
  list-style: none;
  padding-left: 0;
}
img { display: block; max-width: 100%; height: auto; border-radius: 12px; }
*, *::before, *::after { box-sizing: border-box; }
*:not(iframe), *::before, *::after { max-width: 100%; }
iframe {
  box-sizing: border-box;
  max-width: ${LANDING_CONTENT_WIDTH};
  width: 100%;
  min-height: 280px;
  border: 0;
  display: block;
  margin-inline: auto;
}
.map-container,
[class*="map-container" i],
section[id*="map" i],
section[class*="map" i] {
  width: 100%;
  max-width: ${LANDING_CONTENT_WIDTH};
  margin-inline: auto;
}
[data-landing-hero-image="1"] {
  width: ${LANDING_CONTENT_WIDTH};
  margin: 1.25rem auto 0;
}
[data-landing-hero-image="1"] img {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
[data-landing-visuals="1"] {
  width: ${LANDING_CONTENT_WIDTH};
  margin: 1rem auto 0;
  display: grid;
  gap: .9rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  align-items: stretch;
  justify-items: stretch;
}
/* иначе section > * + * даёт margin-top 2–3 img и «ломает» ряд по вертикали */
section[data-landing-visuals="1"] > * + * {
  margin-top: 0 !important;
}
[data-landing-visuals="1"] > img {
  width: 100%;
  min-width: 0;
  margin: 0;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: center;
  border-radius: 12px;
  display: block;
  align-self: stretch;
  justify-self: stretch;
}
section.gallery img,
section[class*="gallery" i] img {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
section.benefits,
section.gallery {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
}
section.benefits [class*="grid"],
section.gallery [class*="grid"] {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)) !important;
  gap: clamp(1rem, 2.2vw, 1.75rem) !important;
  width: 100% !important;
  max-width: 100% !important;
  align-items: stretch !important;
}
section.benefits .benefit-card,
section.benefits .benefits-card,
section.benefits [class*="grid"] > *,
section.gallery [class*="grid"] > * {
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
section.benefits .icon-container {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: fit-content !important;
  max-width: 100% !important;
}
section.benefits .icon-container svg,
section.benefits svg.icon,
section.benefits svg[class*="benefit" i][class*="icon" i] {
  width: 2.5rem !important;
  height: 2.5rem !important;
  max-width: 2.75rem !important;
  max-height: 2.75rem !important;
  flex-shrink: 0 !important;
  display: block !important;
}
section.benefits > h2,
section.gallery > h2,
section.reviews > h2,
section.review > h2 {
  text-align: center !important;
  width: 100% !important;
  max-width: 100% !important;
  margin-left: auto !important;
  margin-right: auto !important;
  margin-bottom: clamp(0.65rem, 2vw, 1.1rem) !important;
  padding-inline: clamp(0.5rem, 2.5vw, 1rem) !important;
  box-sizing: border-box !important;
}
section.reviews,
section.review {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
}
section.reviews [class*="grid"],
section.review [class*="grid"] {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)) !important;
  gap: clamp(1.15rem, 2.4vw, 1.75rem) !important;
  row-gap: clamp(1.25rem, 2.5vw, 1.85rem) !important;
  width: 100% !important;
  max-width: 100% !important;
  align-items: stretch !important;
}
section.reviews [class*="grid"] > *,
section.review [class*="grid"] > * {
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  transform: none !important;
}
section.reviews [class*="grid"] > *:hover,
section.review [class*="grid"] > *:hover {
  transform: translateY(-3px) !important;
}
section .reviews {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)) !important;
  gap: clamp(1.15rem, 2.4vw, 1.75rem) !important;
  row-gap: clamp(1.25rem, 2.5vw, 1.85rem) !important;
  width: 100% !important;
  max-width: 100% !important;
  align-items: stretch !important;
}
section .reviews > h1,
section .reviews > h2,
section .reviews > h3 {
  grid-column: 1 / -1 !important;
  justify-self: stretch;
  width: 100% !important;
  max-width: 100% !important;
}
section .reviews > .review,
section .reviews > article,
section .reviews > .review-card {
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  transform: none !important;
}
section .reviews > .review:hover,
section .reviews > article:hover,
section .reviews > .review-card:hover {
  transform: translateY(-3px) !important;
}
section.reviews > .review,
section.reviews > article,
section.reviews > .review-card,
section.review > .review,
section.review > article,
section.review > .review-card {
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  flex: 0 0 auto !important;
  align-self: stretch !important;
  transform: none !important;
}
section.reviews > .review:hover,
section.reviews > article:hover,
section.reviews > .review-card:hover,
section.review > .review:hover,
section.review > article:hover,
section.review > .review-card:hover {
  transform: translateY(-3px) !important;
}
section.benefits [class*="grid"] > .benefit-card,
section.benefits [class*="grid"] > article {
  transform: none !important;
}
section.benefits [class*="grid"] > .benefit-card:hover,
section.benefits [class*="grid"] > article:hover {
  transform: translateY(-3px) !important;
}
${FOOTER_ICON_SVG_FIX}
@media (max-width: 1024px) {
  section { padding-inline: clamp(0.65rem, 2.5vw, 1rem) !important; }
  section ul:not(nav ul):not(header ul),
  section .cards, section .grid, section .services, section .reviews, section .benefits, section .process {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)) !important;
  }
}
@media (max-width: 767px) {
  html { -webkit-text-size-adjust: 100%; }
  section .cards, section .grid, section .services, section .reviews, section .benefits, section .process,
  section ul:not(nav ul):not(header ul) {
    grid-template-columns: 1fr !important;
  }
}
</style>`;
export const STRUCTURE_STYLE = `<style ${STRUCTURE_MARKER}="1">
${LANDING_ROOT_VARS}
html, body { max-width: 100%; overflow-x: hidden; }
main, section { box-sizing: border-box; }
header { width: 100%; }
section {
  padding-block: clamp(1.5rem, 3vw, 2.5rem);
  padding-inline: clamp(1rem, 3vw, 1.5rem);
}
section > * + * {
  margin-top: clamp(0.75rem, 1.8vw, 1.25rem);
}
main section + section,
body > main > section + section,
body > section + section {
  margin-top: clamp(0.75rem, 1.5vw, 1.25rem);
}
header + main,
header + section,
[data-landing-hero-image="1"] + main,
[data-landing-hero-image="1"] + section {
  margin-top: clamp(0.9rem, 2vw, 1.4rem);
}
[data-landing-hero-image="1"] {
  margin-bottom: clamp(0.9rem, 2vw, 1.4rem);
}
[data-landing-title-fix="1"] > div:first-child,
section[class*="hero" i] > div:first-child {
  padding-inline: clamp(.5rem, 2vw, 1rem);
}
section ul:not(nav ul):not(header ul) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  list-style: none;
  padding-left: 0;
}
section .cards, section .grid, section .services, section .reviews, section .benefits, section .process {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}
section [class*="list"],
section [class*="cards"],
section [class*="grid"] {
  gap: clamp(1rem, 2vw, 1.5rem);
}
section.benefits > h2,
section.gallery > h2,
section.reviews > h2,
section.review > h2,
section[data-lp="reviews"] > h2 {
  text-align: center;
  margin-bottom: clamp(0.75rem, 2vw, 1.2rem);
}
section.cta > h1,
section.cta > h2,
section.cta > h3,
[data-lp="cta"] > h1,
[data-lp="cta"] > h2,
[data-lp="cta"] > h3,
[data-lp="contact"] > h1:first-of-type,
[data-lp="contact"] > h2:first-of-type,
[data-lp="contact"] > h3:first-of-type,
section:has(> [class*="cta-form" i]) > h1:first-of-type,
section:has(> [class*="cta-form" i]) > h2:first-of-type,
section:has(> [class*="cta-form" i]) > h3:first-of-type,
section:has(> [class*="contact-form" i]) > h1:first-of-type,
section:has(> [class*="contact-form" i]) > h2:first-of-type,
section:has(> [class*="contact-form" i]) > h3:first-of-type,
section:has(> [class*="booking-form" i]) > h1:first-of-type,
section:has(> [class*="booking-form" i]) > h2:first-of-type,
section:has(> [class*="booking-form" i]) > h3:first-of-type,
section:has(> [class*="signup-form" i]) > h1:first-of-type,
section:has(> [class*="signup-form" i]) > h2:first-of-type,
section:has(> [class*="signup-form" i]) > h3:first-of-type,
section:has(> form:not([role="search"]):not([class*="search" i])) > h1:first-of-type,
section:has(> form:not([role="search"]):not([class*="search" i])) > h2:first-of-type,
section:has(> form:not([role="search"]):not([class*="search" i])) > h3:first-of-type,
section:has(> .form:not([class*="platform" i])) > h1:first-of-type,
section:has(> .form:not([class*="platform" i])) > h2:first-of-type,
section:has(> .form:not([class*="platform" i])) > h3:first-of-type {
  text-align: center !important;
  width: 100%;
  max-width: min(40rem, 100%);
  margin-left: auto !important;
  margin-right: auto !important;
  box-sizing: border-box;
}
section.benefits {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}
section.benefits > h1,
section.benefits > h2,
section.benefits > h3 {
  grid-column: 1 / -1;
}
section.benefits .benefits-grid,
section.benefits [class*="benefits-grid"],
section.benefits [class*="cards"],
section.benefits [class*="grid"] {
  grid-column: 1 / -1;
  width: 100%;
  max-width: 100%;
  justify-self: stretch;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}
section.gallery {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
}
section.gallery .gallery-grid,
section.gallery [class*="gallery-grid"],
section.gallery [class*="cards"],
section.gallery [class*="grid"] {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)) !important;
  gap: clamp(1rem, 2vw, 1.75rem) !important;
  row-gap: clamp(1rem, 2.2vw, 1.75rem) !important;
  width: 100% !important;
  max-width: 100% !important;
  align-items: stretch !important;
}
section.gallery [class*="grid"] > * {
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
section.reviews,
section.review,
section[data-lp="reviews"] {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: clamp(1rem, 2vw, 1.5rem) !important;
}
section.reviews > h1,
section.reviews > h2,
section.reviews > h3,
section.review > h1,
section.review > h2,
section.review > h3,
section[data-lp="reviews"] > h1,
section[data-lp="reviews"] > h2,
section[data-lp="reviews"] > h3 {
  grid-column: 1 / -1;
  margin: 0 0 clamp(0.75rem, 2vw, 1.2rem);
}
section.reviews .reviews-grid,
section.reviews [class*="reviews-grid"],
section.reviews [class*="review-grid"],
section.reviews [class*="cards"],
section.reviews [class*="grid"],
section.review .reviews-grid,
section.review [class*="reviews-grid"],
section.review [class*="review-grid"],
section.review [class*="cards"],
section.review [class*="grid"],
section[data-lp="reviews"] .reviews-grid,
section[data-lp="reviews"] [class*="reviews-grid"],
section[data-lp="reviews"] [class*="review-grid"],
section[data-lp="reviews"] [class*="cards"],
section[data-lp="reviews"] [class*="grid"] {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)) !important;
  gap: clamp(1rem, 2vw, 1.5rem) !important;
  row-gap: clamp(1rem, 2vw, 1.5rem) !important;
}
section.reviews > .reviews,
section.review > .reviews,
section[data-lp="reviews"] > .reviews {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}
section.reviews > .review + .review,
section.reviews .review + .review,
section.reviews > .review-card + .review-card,
section.reviews .review-card + .review-card,
section.reviews > article + article,
section.reviews article + article,
section.review > .review + .review,
section.review .review + .review,
section.review > .review-card + .review-card,
section.review .review-card + .review-card,
section.review > article + article,
section.review article + article,
section[data-lp="reviews"] > .review + .review,
section[data-lp="reviews"] .review + .review,
section[data-lp="reviews"] > .review-card + .review-card,
section[data-lp="reviews"] .review-card + .review-card,
section[data-lp="reviews"] > article + article,
section[data-lp="reviews"] article + article,
section[data-lp="reviews"] .reviews > .review + .review,
section[data-lp="reviews"] .reviews > .review-card + .review-card,
section[data-lp="reviews"] .reviews > article + article {
  margin-top: clamp(1rem, 2vw, 1.5rem);
}
footer form,
section[id*="footer" i] form,
section[class*="footer" i] form {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: .75rem;
}
footer form > *,
section[id*="footer" i] form > *,
section[class*="footer" i] form > * {
  margin: 0 !important;
}
footer form input + button,
footer form textarea + button,
footer form select + button,
section[id*="footer" i] form input + button,
section[id*="footer" i] form textarea + button,
section[id*="footer" i] form select + button,
section[class*="footer" i] form input + button,
section[class*="footer" i] form textarea + button,
section[class*="footer" i] form select + button {
  margin-left: .75rem !important;
}
@media (max-width: 640px) {
  footer form input + button,
  footer form textarea + button,
  footer form select + button,
  section[id*="footer" i] form input + button,
  section[id*="footer" i] form textarea + button,
  section[id*="footer" i] form select + button,
  section[class*="footer" i] form input + button,
  section[class*="footer" i] form textarea + button,
  section[class*="footer" i] form select + button {
    margin-left: 0 !important;
    margin-top: .75rem !important;
  }
}
${FOOTER_ICON_SVG_FIX}
section .service-card,
section .review-card,
section .benefit-card,
section .benefits-card,
section .product-card,
section .grid-item,
section .faq-item,
section .review {
  padding: clamp(1rem, 2.5vw, 1.35rem);
  box-sizing: border-box;
  margin: 0;
}
img { display: block; max-width: 100%; height: auto; border-radius: 12px; }
*, *::before, *::after { box-sizing: border-box; }
*:not(iframe), *::before, *::after { max-width: 100%; }
iframe {
  box-sizing: border-box;
  max-width: ${LANDING_CONTENT_WIDTH};
  width: 100%;
  min-height: 280px;
  border: 0;
}
[data-landing-hero-image="1"] {
  width: ${LANDING_CONTENT_WIDTH};
  margin: 1.25rem auto 0;
}
[data-landing-hero-image="1"] img {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
section.gallery img,
section[class*="gallery" i] img {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
[data-landing-title-fix="1"] h1 {
  background: none !important;
  box-shadow: none !important;
  border: 0 !important;
  -webkit-text-fill-color: inherit !important;
}
section[class*="hero" i] {
  text-align: center;
}
[data-landing-title-fix="1"] .hero-text,
[data-landing-title-fix="1"] .hero-content,
section[class*="hero" i] .hero-text,
section[class*="hero" i] .hero-content {
  text-align: center;
}
[data-landing-title-fix="1"] > div:first-child,
section[class*="hero" i] > div:first-child {
  text-align: center;
}
[data-landing-title-fix="1"] h1,
[data-landing-title-fix="1"] p,
[data-landing-title-fix="1"] button {
  text-align: center;
}
[class*="hero" i] .hero-content,
header[class*="hero" i] .hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.65rem, 2vw, 1.25rem);
  width: 100%;
  max-width: 100%;
  padding-inline: clamp(0.75rem, 2.2vw, 1.5rem);
  box-sizing: border-box;
}
[class*="hero" i] .hero-content > h1,
[class*="hero" i] .hero-content > p {
  width: 100%;
  max-width: min(42rem, 100%);
  margin-left: auto;
  margin-right: auto;
}
[class*="hero" i] .hero-content > .cta-button,
[class*="hero" i] .hero-content > button {
  width: auto;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
}
[data-landing-visuals="1"] {
  width: min(100%, ${LANDING_CONTENT_WIDTH});
  margin: 1.25rem auto 0;
  display: grid;
  gap: clamp(1rem, 2vw, 1.75rem);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  align-items: stretch;
  justify-items: stretch;
}
section[data-landing-visuals="1"] > * + * {
  margin-top: 0 !important;
}
@media (max-width: 1024px) {
  section {
    padding-inline: clamp(0.75rem, 2.5vw, 1rem);
  }
  section ul:not(nav ul):not(header ul),
  section .cards, section .grid, section .services, section .reviews, section .benefits, section .process {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  }
}
@media (max-width: 767px) {
  html { -webkit-text-size-adjust: 100%; }
  section ul:not(nav ul):not(header ul),
  section .cards, section .grid, section .services, section .reviews, section .benefits, section .process {
    grid-template-columns: 1fr;
  }
  section.benefits .benefits-grid,
  section.benefits [class*="benefits-grid"],
  section.gallery .gallery-grid,
  section.gallery [class*="gallery-grid"],
  section.gallery [class*="grid"],
  section.reviews,
  section.review,
  section.reviews .reviews-grid,
  section.reviews [class*="reviews-grid"],
  section.reviews [class*="review-grid"],
  section.review .reviews-grid,
  section.review [class*="reviews-grid"],
  section.review [class*="review-grid"],
  section[data-lp="reviews"],
  section[data-lp="reviews"] .reviews,
  section[data-lp="reviews"] .reviews-grid,
  section[data-lp="reviews"] [class*="reviews-grid"],
  section[data-lp="reviews"] [class*="review-grid"] {
    grid-template-columns: 1fr;
  }
  [data-landing-visuals="1"] {
    grid-template-columns: 1fr !important;
  }
  [data-landing-title-fix="1"],
  header[class*="hero" i],
  section[class*="hero" i],
  div[class*="hero" i] {
    flex-direction: column;
  }
}
[data-landing-visuals="1"] > img {
  width: 100%;
  min-width: 0;
  margin: 0;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: center;
  border-radius: 12px;
  display: block;
  align-self: stretch;
  justify-self: stretch;
}
</style>`;
export const LEAD_FORM_STYLE = `<style ${LEAD_FORM_MARKER}="1">
#lead-form {
  max-width: min(640px, calc(100% - 2rem));
  margin: 2rem auto;
  padding: clamp(1rem, 2.5vw, 1.5rem);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.96));
  border: 1px solid rgba(148,163,184,.28);
  box-shadow: 0 18px 45px -28px rgba(15,23,42,.45);
}
#lead-form h2 {
  margin: 0 0 .35rem;
  font-size: clamp(1.15rem, 2.2vw, 1.45rem);
  line-height: 1.2;
}
#lead-form p { margin: 0 0 1rem; opacity: .78; line-height: 1.45; }
#lead-form form { display: grid; gap: .85rem; }
#lead-form .lf-grid {
  display: grid;
  gap: .85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
#lead-form, #lead-form * { box-sizing: border-box; }
#lead-form label { display: block; font-size: .9rem; margin: 0 0 .35rem; opacity: .86; }
#lead-form input,
#lead-form textarea {
  width: 100%;
  padding: .75rem .85rem;
  border-radius: 12px;
  border: 1px solid rgba(148,163,184,.55);
  background: #fff;
  color: #0f172a;
  font: inherit;
  outline: none;
}
#lead-form input:focus,
#lead-form textarea:focus {
  border-color: rgba(99,102,241,.75);
  box-shadow: 0 0 0 3px rgba(99,102,241,.15);
}
#lead-form .lf-col-2 { grid-column: 1 / -1; }
#lead-form .lf-actions { margin-top: .35rem; }
#lead-form .lf-submit {
  width: auto;
  min-width: 180px;
  max-width: 100%;
  border: 0;
  border-radius: 12px;
  padding: .7rem 1rem;
  font: inherit;
  font-size: .95rem;
  line-height: 1.2;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  cursor: pointer;
}
#lead-form .lf-submit:hover { filter: brightness(1.05); }
#lead-form button[type="submit"] {
  width: auto;
  min-width: 180px;
  border: 0;
  border-radius: 12px;
  padding: .7rem 1rem;
  font: inherit;
  font-size: .95rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  cursor: pointer;
}
#lead-form button[type="submit"]:hover { filter: brightness(1.05); }
@media (max-width: 640px) {
  #lead-form .lf-grid { grid-template-columns: 1fr; }
}

form {
  width: min(680px, calc(100% - 2rem));
  margin: 1.5rem auto;
  padding: clamp(1rem, 2.2vw, 1.4rem);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.96));
  border: 1px solid rgba(148,163,184,.28);
  box-shadow: 0 16px 40px -30px rgba(15,23,42,.45);
}
form > * + * { margin-top: .7rem; }
form label { display: block; margin: 0 0 .35rem; font-size: .92rem; opacity: .86; }
form input, form textarea, form select {
  width: 100%;
  padding: .72rem .85rem;
  border-radius: 12px;
  border: 1px solid rgba(148,163,184,.55);
  background: #fff;
  color: #0f172a;
  font: inherit;
  outline: none;
}
form input:focus, form textarea:focus, form select:focus {
  border-color: rgba(99,102,241,.75);
  box-shadow: 0 0 0 3px rgba(99,102,241,.15);
}
form button[type="submit"] {
  width: auto;
  min-width: 180px;
  border: 0;
  border-radius: 12px;
  padding: .7rem 1rem;
  font: inherit;
  font-size: .95rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  cursor: pointer;
  margin-top: .35rem;
}
form button[type="submit"]:hover { filter: brightness(1.05); }
</style>`;

export function structureStyleForMode(mode: LandingLayoutMode): string {
  return mode === "minimal" ? STRUCTURE_STYLE_MINIMAL : STRUCTURE_STYLE;
}
