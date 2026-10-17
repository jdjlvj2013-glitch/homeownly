// Legal pages: Affiliate Disclosure, Privacy Policy, Terms of Use.
// DRAFT: written in plain language as a starting point. Have a lawyer review before launch.
import React from 'react';
import { APP_NAME, LEGAL, PRICING } from './config.js';

export const LEGAL_SCREENS = ['disclosure', 'privacy', 'terms'];
export const LEGAL_TITLES = { disclosure: 'Affiliate Disclosure', privacy: 'Privacy Policy', terms: 'Terms of Use' };

const Draft = () => LEGAL.draft ? <div className="banner warn legaldraft"><b>Draft: have a lawyer review before launch.</b> This page is a plain-language draft and is not legal advice.</div> : null;
const Contact = () => <p>Questions? Email <b className="todo">{LEGAL.contactEmail}</b>{LEGAL.contactEmail.startsWith('TODO') && <span className="todo"> (TODO: real contact email)</span>}.</p>;
const Updated = () => <p className="muted small">Last updated: {LEGAL.updated}</p>;
const Sec = ({ h, children }) => <section className="legalsec"><h3>{h}</h3>{children}</section>;

// The short line shown next to every filter buy / reorder link.
export const CommissionNote = () => <p className="commission">We may earn a commission when you buy through this link, at no extra cost to you. <a href="#/disclosure">Learn more</a></p>;

// Footer links (Account tab, signup, public unit page).
export const LegalLinks = ({ className = '' }) => <p className={'legallinks ' + className}><a href="#/terms">Terms of Use</a> · <a href="#/privacy">Privacy Policy</a> · <a href="#/disclosure">Affiliate Disclosure</a></p>;

export function Disclosure() {
  return (<article className="card legal"><Draft /><h2>Affiliate Disclosure</h2><Updated />
    <p className="lead">Short version: <b>some links in {APP_NAME} are affiliate links. If you buy through one, we may earn a commission. You don’t pay anything extra.</b></p>
    <Sec h="What this means">
      <p>{APP_NAME} is run by {LEGAL.owner}, in {LEGAL.city}. When the app shows a button to buy, reorder or set up auto-ship for an air filter (or other home-maintenance supplies), that link may go to a store we have an affiliate or referral agreement with.</p>
      <p>If you click the link and buy something, that store may pay us a commission or a referral fee. For some stores this includes your later repeat or auto-ship orders. The price you pay is the same as going to the store yourself.</p>
    </Sec>
    <Sec h="Where you’ll see it">
      <p>Every filter buy, reorder or auto-ship link in the app has a note next to it that says <i>“We may earn a commission.”</i> That note links back to this page.</p>
    </Sec>
    <Sec h="How we pick what to show">
      <p>We show you the filter size you saved for your system. We try to send you to stores that carry that size at a fair price and ship reliably. A commission can influence which store we partner with, so we want you to know about it. You can always buy the same size anywhere you like, including a local supply house. Your reminders work either way.</p>
      <p>Always check the size printed on the edge of your current filter before you order.</p>
    </Sec>
    <Sec h="Our other connections">
      <p>{APP_NAME} was started by a working HVAC technician in {LEGAL.city}. Some users get a referral code from their technician. Referral codes give the user a discount on {APP_NAME} Plus. They don’t change any recommendation the app makes.</p>
      <p>{APP_NAME} Plus is our own paid subscription ({`$${PRICING.monthly}/month or $${PRICING.yearly}/year`}). It is separate from any affiliate link.</p>
    </Sec>
    <Sec h="What we don’t do">
      <p>We don’t take money to say a product is good. We don’t write fake reviews. Stores don’t get your account details from us. See the <a href="#/privacy">Privacy Policy</a> for what the store sees when you click a link.</p>
    </Sec>
    <Contact />
  </article>);
}

export function Privacy() {
  return (<article className="card legal"><Draft /><h2>Privacy Policy</h2><Updated />
    <p className="lead">Short version: <b>your home and equipment data is yours. We use it to run the app. We don’t sell it.</b> The only thing that is public is the unit history you choose to share with a QR label, and it never includes your name, address, costs or notes.</p>
    <Sec h="Who we are">
      <p>{APP_NAME} is run by {LEGAL.owner}, {LEGAL.city} ({LEGAL.business}). “We” and “us” in this policy means {APP_NAME}.</p>
    </Sec>
    <Sec h="What you put in the app">
      <p>Your name and email; your homes and equipment (brand, model, serial number, install date, filter size, warranty dates); your service log (dates, work done, company, costs, notes); power-bill numbers if you enter them; your maintenance agreement details; and any referral code you enter.</p>
      <p>When you scan a data tag, the photo is read <b>on your device</b> to find the model and serial number. We don’t upload or keep the photo. The text-reading engine is downloaded from a public code server (jsDelivr) the first time you use it.</p>
    </Sec>
    <Sec h="Where it’s stored">
      <p><b>On your device.</b> The app saves your data in your browser’s local storage so it works offline. It also saves a few small settings there (for example, the last email you signed in with). Clearing your browser data removes it from that device.</p>
      <p><b>In your account (if you sign in).</b> Accounts and cloud sync run on Supabase, our database and login provider. Supabase stores your email, your password (in hashed form, never readable by us) and a copy of your app data so you can use it on other devices. Login sessions are kept in your browser’s local storage. Access is limited so that only you can read or change your account data.</p>
      <p><b>Hosting.</b> The app is hosted on GitHub Pages. Like any web host, GitHub may log basic technical data such as your IP address when the app loads.</p>
    </Sec>
    <Sec h="Unit QR labels: what is public">
      <p>If you print a unit QR label, <b>anyone who scans it or has the link can see</b>:</p>
      <ul><li>Brand, model and serial number of the outdoor and indoor units, unit type, install date, and the estimated age and size</li>
        <li>Your most recent service visits (up to 50): the date, the first 60 characters of the work description, and the company name</li></ul>
      <p>It <b>never</b> includes your name, email, address, costs or notes. Because the work description is shown, don’t put personal details in it.</p>
      <p><b>Live labels</b> (when signed in) look up the latest history from our database each time they are scanned, using a random unit ID. Deleting your data turns them off. <b>Offline labels</b> (not signed in) store a snapshot inside the QR code itself. Anyone holding the printed label can read that snapshot, and it can’t be switched off remotely, so remove or destroy old labels you no longer want readable.</p>
    </Sec>
    <Sec h="Affiliate links and cookies">
      <p>{APP_NAME} itself doesn’t use advertising cookies or ad trackers. When you tap a filter buy or reorder link, you leave {APP_NAME} and go to the store’s site. The link includes your filter size and our partner ID. The store, and the affiliate network it uses (such as Awin, Impact, Rakuten or Refersion), may set cookies or similar tracking on <i>their</i> site to credit us for your order. Their privacy policies apply there.</p>
      <p>Stores usually report to us only order totals and commissions. They don’t get your {APP_NAME} account or equipment data from us. See the <a href="#/disclosure">Affiliate Disclosure</a>.</p>
    </Sec>
    <Sec h="How we use your data">
      <p>To run the app: reminders, service history, estimates, reports, cloud sync, sign-in emails, and to answer you when you contact us. We may look at overall, non-identifying usage to improve the app.</p>
    </Sec>
    <Sec h="We don’t sell your data">
      <p><b>We do not sell your personal information, and we don’t share it for targeted advertising.</b> We share it only with service providers that run the app for us (Supabase, GitHub), when the law requires it, or as part of a sale of the business, in which case this policy keeps applying to your data.</p>
    </Sec>
    <Sec h="Your choices">
      <p>You can edit your data in the app at any time. <b>Account → Delete my data</b> removes your saved homes, equipment and history from the cloud and this device, and turns off live unit QR labels. To close your login account completely, email us. You can use {APP_NAME} on one device without an account.</p>
    </Sec>
    <Sec h="Kids">
      <p>{APP_NAME} is for adults managing a home. It isn’t meant for children under 13, and we don’t knowingly collect their information.</p>
    </Sec>
    <Sec h="Security and changes">
      <p>We use encrypted connections and access rules to protect your data, but no system is perfect. If we change this policy in a meaningful way, we’ll update the date above and tell you in the app.</p>
    </Sec>
    <Contact />
  </article>);
}

export function Terms() {
  return (<article className="card legal"><Draft /><h2>Terms of Use</h2><Updated />
    <p className="lead">Short version: <b>{APP_NAME} helps you keep track of your home’s equipment. It gives information, not repairs. Stay safe: when in doubt, call a licensed pro.</b></p>
    <Sec h="1. Agreement">
      <p>These terms are an agreement between you and {LEGAL.business}, {LEGAL.state} (“{APP_NAME}”, “we”). By using {APP_NAME} you agree to them. If you don’t agree, please don’t use the app. You must be 18 or older.</p>
    </Sec>
    <Sec h="2. Information only">
      <p>The app’s estimates (equipment age from serial numbers, system size, refrigerant type, power-bill checks, replacement timing and cost ranges) are based on public patterns and the data you enter. They can be wrong. Use them as a starting point, not a final answer.</p>
    </Sec>
    <Sec h="3. “Before you call” checks">
      <p>The “Thinking about a call?” and before-you-call checks are <b>informational only</b>. They are not a diagnosis and not repair instructions. <b>You choose whether to do any check, and you act at your own risk.</b></p>
      <ul>
        <li><b>Turn the power off before opening any panel</b>: set the thermostat to off, then switch off the unit’s disconnect or breaker (and the furnace service switch). Never open a panel on equipment that is running.</li>
        <li>Never open gas valves, gas piping, the burner area, electrical boxes or refrigerant lines. That work is for licensed technicians.</li>
        <li>If something doesn’t look right, or you aren’t comfortable, stop and call a pro.</li>
      </ul>
    </Sec>
    <Sec h="4. Not a substitute for a licensed technician">
      <p>{APP_NAME} does not replace an inspection or repair by a licensed, qualified HVAC technician. Follow your equipment maker’s instructions and local codes. Some work legally requires a licensed contractor.</p>
    </Sec>
    <Sec h="5. Safety symptoms: call a pro">
      <p className="safetyline"><b>If you smell gas</b> (rotten eggs): leave the home now and call your gas company or 911 from outside. Don’t flip switches. <b>If a carbon monoxide alarm sounds, or you see smoke, sparks, or smell burning or electrical odors</b>: turn the system off if it is safe to do so, get out if needed, and call 911 or a licensed technician. Water near electrical parts is also a reason to keep the power off and call a pro. Don’t use the app to work around a safety problem.</p>
    </Sec>
    <Sec h="6. Your account and your data">
      <p>Keep your login safe. You’re responsible for what you enter. Don’t enter anything you don’t have the right to share. If you share a unit QR label, the information described in the <a href="#/privacy">Privacy Policy</a> becomes viewable by anyone with the label or link.</p>
    </Sec>
    <Sec h={`7. ${APP_NAME} Plus`}>
      <p>Some features are part of {APP_NAME} Plus, a paid subscription, with a free trial. Prices, billing and cancellation terms will be shown before you pay. We may change features or prices with notice.</p>
    </Sec>
    <Sec h="8. Products from other stores">
      <p>Filters and other products you buy through links in the app are sold by other companies. Their terms, prices, shipping, returns and warranties apply. We aren’t the seller and aren’t responsible for their products or service. We may earn a commission; see the <a href="#/disclosure">Affiliate Disclosure</a>.</p>
    </Sec>
    <Sec h="9. Fair use">
      <p>Don’t misuse the app: no hacking, scraping, overloading it, or using it to break the law.</p>
    </Sec>
    <Sec h="10. No warranty; limits on liability">
      <p>The app is provided “as is” and “as available”, without warranties of any kind, to the extent the law allows. To the fullest extent permitted by law, {APP_NAME} is not liable for damage to property, equipment, injury, or indirect or consequential losses arising from your use of the app or from acting on its information. Where liability can’t be excluded, it is limited to the amount you paid us in the 12 months before the claim (or $50 if you paid nothing). Some laws don’t allow these limits, so they may not all apply to you.</p>
    </Sec>
    <Sec h="11. Changes and ending">
      <p>We may update these terms; we’ll change the date above and tell you in the app about major changes. You can stop using the app at any time and delete your data from the Account tab. We may suspend accounts that break these terms.</p>
    </Sec>
    <Sec h="12. Law">
      <p>These terms are governed by the laws of the State of {LEGAL.state}, USA. Disputes will be handled in the courts located in Ouachita Parish, Louisiana, unless the law requires otherwise.</p>
    </Sec>
    <Contact />
  </article>);
}
