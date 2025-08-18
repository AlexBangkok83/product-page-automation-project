const { PageTemplate, PageTemplateTranslation } = require('../models/PageTemplate');
const database = require('./db');

const pageTemplateData = [
    {
        template_key: 'terms',
        template_type: 'legal',
        translations: [
            {
                language_code: 'en',
                title: 'Terms & Conditions',
                slug: 'terms-and-conditions',
                meta_title: 'Terms & Conditions',
                meta_description: 'Terms and conditions for using our online store and services.',
                content: `# Terms & Conditions for $domain

## 1. General
These terms apply when you visit or shop on $domain, operated by $company_name ($company_orgnr, $company_address). The laws of $country apply, including consumer protection and e-commerce legislation.

## 2. Age requirement
You must be at least 18 years old or have parental consent to place an order.

## 3. Orders & payment
All prices are stated in $currency including VAT. We reserve the right to correct errors or price changes. Payment is processed via the available options at checkout.

## 4. Delivery
Delivery follows our Delivery Policy. Risk transfers to the customer once the goods have been delivered.

## 5. Right of withdrawal & returns
You have the right to withdraw from your purchase within 14 days by law. $domain also offers a voluntary 30-day return policy.

- Items must be unused and in original packaging.
- The customer pays return shipping.
- Contact $contact_email before returning goods.

## 6. Complaints
You are entitled to file a complaint for faulty goods within three years under consumer law.

## 7. Disputes
Disputes may be referred to national consumer authorities or the EU Online Dispute Resolution platform: https://ec.europa.eu/consumers/odr.

## Contact Information
If you have any questions about these Terms & Conditions, please contact us at $contact_email.`
            },
            {
                language_code: 'sv',
                title: 'Användarvillkor',
                slug: 'anvandarvillkor',
                meta_title: 'Användarvillkor',
                meta_description: 'Användarvillkor för användning av vår webbshop och tjänster.',
                content: `# Användarvillkor för $domain

## 1. Allmänt
Dessa användarvillkor gäller när du besöker eller handlar på $domain, som drivs av $company_name ($company_orgnr, $company_address). Lagar i $country tillämpas, inklusive Konsumentköplagen, Distansavtalslagen och E-handelslagen.

## 2. Åldersgräns
För att handla på $domain måste du vara minst 18 år eller ha målsmans tillstånd.

## 3. Beställning & betalning
Alla priser anges i $currency inklusive moms. Vi reserverar oss för eventuella skrivfel och prisändringar. Betalning sker genom de betalningsalternativ som erbjuds i kassan.

## 4. Leverans
Leverans sker enligt villkor i vår Leveranspolicy. Risken övergår till dig när varan har levererats.

## 5. Ångerrätt & retur
Du har rätt att ångra ditt köp inom 14 dagar enligt Distansavtalslagen. $domain erbjuder dessutom en utökad returperiod på 30 dagar från mottagandet av varan.

- Produkten ska vara i ursprungligt skick och förpackning.
- Kunden betalar returfrakten.
- Kontakta oss på $contact_email innan retur.

## 6. Reklamation
Vid fel på varan har du rätt att reklamera inom tre år enligt Konsumentköplagen. Vi följer Allmänna Reklamationsnämndens (ARN) rekommendationer.

## 7. Tvistlösning
Vid tvist kan du vända dig till ARN eller EU:s Online Dispute Resolution: https://ec.europa.eu/consumers/odr.

## Kontaktinformation
Om du har frågor om dessa användarvillkor, kontakta oss på $contact_email.`
            }
        ]
    },
    {
        template_key: 'privacy',
        template_type: 'legal',
        translations: [
            {
                language_code: 'en',
                title: 'Privacy Policy',
                slug: 'privacy-policy',
                meta_title: 'Privacy Policy',
                meta_description: 'Our privacy policy explains how we collect, use, and protect your personal information.',
                content: `# Privacy Policy for $domain

## 1. Controller
$company_name ($company_orgnr, $company_address) is responsible for your personal data. Contact: $contact_email.

## 2. Data we collect
- Contact details (name, address, e-mail, phone)
- Order and payment information
- Technical data (cookies, IP address, browser)

## 3. Purpose & legal basis
- Order processing (Contract)
- Customer service (Legitimate interest)
- Marketing (Consent)
- Accounting (Legal obligation)

## 4. Your rights
You may request access, correction, deletion, restriction, portability, and object to processing. Contact $contact_email to exercise these rights.

## 5. Retention
Data is stored only as long as necessary or as required by law (e.g., 7 years for accounting).

## 6. Third parties
We share data only with necessary providers (payment, shipping). Data processing agreements are in place.

## 7. Cookies
$domain uses cookies. You may revoke consent in your browser settings.

## 8. Supervisory authority
You may file complaints with your national data protection authority (e.g., IMY in Sweden).

## Contact
For questions about this privacy policy, contact $contact_email.`
            },
            {
                language_code: 'sv',
                title: 'Integritetspolicy',
                slug: 'integritetspolicy',
                meta_title: 'Integritetspolicy',
                meta_description: 'Vår integritetspolicy förklarar hur vi samlar in, använder och skyddar din personliga information.',
                content: `# Integritetspolicy för $domain

## 1. Personuppgiftsansvarig
$company_name ($company_orgnr, $company_address). Kontakt: $contact_email.

## 2. Vilka uppgifter vi samlar in
- Kontaktuppgifter (namn, adress, e-post, telefon)
- Order- och betalningsinformation
- Tekniska data (cookies, IP-adress, webbläsare)

## 3. Ändamål & laglig grund
- Hantera beställningar (Avtal)
- Kundservice (Berättigat intresse)
- Marknadsföring (Samtycke)
- Bokföring (Rättslig förpliktelse)

## 4. Dina rättigheter
Du har rätt till: tillgång, rättelse, radering, begränsning, dataportabilitet och att invända mot behandling. Kontakta $contact_email för att utöva dessa rättigheter.

## 5. Lagringstid
Uppgifter sparas endast så länge det är nödvändigt eller enligt lagkrav (t.ex. 7 år för bokföring).

## 6. Tredje parter
Vi delar endast data med leverantörer som behövs för att fullgöra våra tjänster (betalning, frakt). Avtal för personuppgiftsbiträde finns.

## 7. Cookies
$domain använder cookies. Du kan återkalla samtycke via webbläsarinställningar.

## 8. Tillsynsmyndighet
Om du inte är nöjd med vår hantering kan du kontakta Integritetsskyddsmyndigheten (IMY).

## Kontakt
För frågor om denna integritetspolicy, kontakta $contact_email.`
            }
        ]
    },
    {
        template_key: 'refund',
        template_type: 'legal',
        translations: [
            {
                language_code: 'en',
                title: 'Refund Policy',
                slug: 'refund-policy',
                meta_title: 'Refund Policy',
                meta_description: 'Our refund policy outlines the terms and conditions for returns and refunds.',
                content: `# Refund Policy for $domain

## 1. Return Period
Under the Distance Selling Act, you have the right to cancel your order within 14 days of receipt without giving any reason. $domain also offers a voluntary 30-day return policy.

## 2. Condition of Items
Items must be returned in their original condition, unworn, and in original packaging. The customer is responsible for any decrease in value of the goods as a result of handling beyond what is necessary to establish the nature, characteristics, and functioning of the goods.

## 3. Return Process
To initiate a return:
1. Contact $contact_email within the return period
2. Include your order number and reason for return
3. We will provide return instructions and any necessary documentation
4. Package items securely in original packaging

## 4. Return Shipping
The customer is responsible for return shipping costs unless:
- The item was damaged, defective, or incorrect
- $domain is exercising its right of withdrawal
- Otherwise required by law

## 5. Refund Processing
- Refunds will be processed within 14 days of receiving the returned item
- Refunds will be made to the original payment method
- Original shipping costs may be deducted (except for defective/incorrect items)

## 6. Exchanges
We offer exchanges for different sizes or colors, subject to availability. Contact $contact_email to arrange an exchange.

## 7. Non-Returnable Items
The following items cannot be returned for hygienic reasons or due to their nature:
- Personalized or custom-made products
- Perishable goods
- Digital downloads
- Items specified as non-returnable at time of purchase

## 8. Damaged or Defective Items
If you receive a damaged or defective item:
- Contact us immediately at $contact_email
- Provide photos of the damage/defect
- We will arrange replacement or full refund including shipping costs

## 9. Disputes
For disputes regarding returns, you may contact consumer authorities in $country or use the EU Online Dispute Resolution platform: https://ec.europa.eu/consumers/odr.

## Contact Information
For questions about returns and refunds, contact $contact_email.`
            },
            {
                language_code: 'sv',
                title: 'Returpolicy',
                slug: 'returpolicy',
                meta_title: 'Returpolicy',
                meta_description: 'Vår returpolicy beskriver villkoren för returer och återbetalningar.',
                content: `# Returpolicy för $domain

## 1. Returperiod
Enligt Distansavtalslagen har du rätt att ångra ditt köp inom 14 dagar från mottagandet utan att ange anledning. $domain erbjuder dessutom en utökad returperiod på 30 dagar.

## 2. Varornas skick
Varor måste returneras i originalskick, oanvända och i originalförpackning. Kunden ansvarar för eventuell värdeminskning av varan som beror på annan hantering än vad som är nödvändigt för att fastställa varans beskaffenhet, egenskaper och funktion.

## 3. Returprocess
För att påbörja en retur:
1. Kontakta $contact_email inom returperioden
2. Uppge ditt ordernummer och anledning till returen
3. Vi tillhandahåller returinstruktioner och nödvändig dokumentation
4. Förpacka varorna säkert i originalförpackning

## 4. Returfrakt
Kunden ansvarar för returfrakt utom när:
- Varan var skadad, defekt eller felaktig
- $domain utövar sin ångerrätt
- Annat följer av lag

## 5. Återbetalningsprocess
- Återbetalning sker inom 14 dagar efter att vi mottagit den returnerade varan
- Återbetalning görs till samma betalningsmetod som användes vid köpet
- Ursprungliga fraktkostnader kan dras av (utom för defekta/felaktiga varor)

## 6. Byten
Vi erbjuder byten mot olika storlekar eller färger beroende på tillgänglighet. Kontakta $contact_email för att ordna ett byte.

## 7. Ej returerbara varor
Följande varor kan inte returneras av hygieniska skäl eller på grund av deras beskaffenhet:
- Personaliserade eller specialtillverkade produkter
- Lättfördärvliga varor
- Digitala nedladdningar
- Varor som specificerats som icke-returerbara vid köptillfället

## 8. Skadade eller defekta varor
Om du mottar en skadad eller defekt vara:
- Kontakta oss omedelbart på $contact_email
- Bifoga bilder på skadan/defekten
- Vi ordnar ersättning eller full återbetalning inklusive fraktkostnader

## 9. Tvistlösning
Vid tvister gällande returer kan du kontakta konsumentmyndigheter i $country eller använda EU:s Online Dispute Resolution: https://ec.europa.eu/consumers/odr.

## Kontaktinformation
För frågor om returer och återbetalningar, kontakta $contact_email.`
            }
        ]
    },
    {
        template_key: 'delivery',
        template_type: 'legal',
        translations: [
            {
                language_code: 'en',
                title: 'Delivery Policy',
                slug: 'delivery-policy',
                meta_title: 'Delivery Policy',
                meta_description: 'Information about our shipping methods, delivery times, and policies.',
                content: `# Delivery Policy for $domain

## 1. Shipping Methods
We offer the following shipping options:
- Standard delivery (5-7 business days)
- Express delivery (2-3 business days)
- Same-day delivery (where available)

## 2. Delivery Times
Estimated delivery times:
- Standard shipping: 5-7 business days
- Express shipping: 2-3 business days
- International shipping: 7-14 business days (varies by destination)

Delivery times are estimates and may vary due to weather, holidays, or other circumstances beyond our control.

## 3. Shipping Costs
- Shipping costs are calculated at checkout based on destination, weight, and shipping method
- Free standard shipping available for orders over a specified amount (varies by country)
- Express and international shipping rates apply as shown at checkout
- All prices include applicable taxes and fees

## 4. Order Processing
- Orders are processed within 1-2 business days (Monday-Friday)
- Orders placed on weekends or holidays are processed the next business day
- Processing time may be extended during peak seasons

## 5. Tracking Information
- Tracking information is sent via email once your order ships
- Track your package using the provided tracking number
- For issues with tracking, contact $contact_email

## 6. Delivery Confirmation
- Signature confirmation may be required for high-value orders
- Safe delivery to the address provided is the customer's responsibility
- We are not liable for packages lost due to incorrect addresses

## 7. International Shipping
- We ship to select international destinations
- Additional customs duties, taxes, and fees may apply and are the customer's responsibility
- Delivery times for international orders may vary
- Some products may be restricted for international shipping

## 8. Delivery Issues
If you experience delivery issues:
- Check tracking information first
- Contact the carrier directly for delivery updates
- Contact $contact_email if the package is lost or damaged
- Report delivery issues within 48 hours of expected delivery

## 9. Address Changes
- Address changes must be made before the order ships
- Contact $contact_email immediately for address corrections
- We cannot guarantee address changes once shipped

## 10. Risk Transfer
Risk of loss and title for items pass to the customer upon delivery to the carrier.

## Contact Information
For questions about shipping and delivery, contact $contact_email.`
            },
            {
                language_code: 'sv',
                title: 'Leveranspolicy',
                slug: 'leveranspolicy',
                meta_title: 'Leveranspolicy',
                meta_description: 'Information om våra leveransmetoder, leveranstider och policyer.',
                content: `# Leveranspolicy för $domain

## 1. Leveransmetoder
Vi erbjuder följande leveransalternativ:
- Standardleverans (5-7 arbetsdagar)
- Expressleverans (2-3 arbetsdagar)
- Samdagsleverans (där tillgängligt)

## 2. Leveranstider
Beräknade leveranstider:
- Standardfrakt: 5-7 arbetsdagar
- Expressfrakt: 2-3 arbetsdagar
- Internationell frakt: 7-14 arbetsdagar (varierar per destination)

Leveranstider är uppskattningar och kan variera på grund av väder, helger eller andra omständigheter utanför vår kontroll.

## 3. Fraktkostnader
- Fraktkostnader beräknas vid kassan baserat på destination, vikt och leveransmetod
- Fri standardfrakt tillgänglig för beställningar över ett specificerat belopp (varierar per land)
- Express- och internationella frakttariffer tillämpas enligt vad som visas vid kassan
- Alla priser inkluderar tillämpliga skatter och avgifter

## 4. Orderbehandling
- Beställningar behandlas inom 1-2 arbetsdagar (måndag-fredag)
- Beställningar som görs på helger behandlas nästa arbetsdag
- Behandlingstiden kan förlängas under högsäsong

## 5. Spårningsinformation
- Spårningsinformation skickas via e-post när din beställning levereras
- Spåra ditt paket med det medföljande spårningsnumret
- För problem med spårning, kontakta $contact_email

## 6. Leveransbekräftelse
- Signaturbekräftelse kan krävas för beställningar av högt värde
- Säker leverans till den angivna adressen är kundens ansvar
- Vi ansvarar inte för paket som försvinner på grund av felaktiga adresser

## 7. Internationell leverans
- Vi levererar till utvalda internationella destinationer
- Ytterligare tullavgifter, skatter och avgifter kan tillkomma och är kundens ansvar
- Leveranstider för internationella beställningar kan variera
- Vissa produkter kan vara begränsade för internationell leverans

## 8. Leveransproblem
Om du upplever leveransproblem:
- Kontrollera spårningsinformation först
- Kontakta fraktföretaget direkt för leveransuppdateringar
- Kontakta $contact_email om paketet är förlorat eller skadat
- Rapportera leveransproblem inom 48 timmar från förväntad leverans

## 9. Adressändringar
- Adressändringar måste göras innan beställningen skickas
- Kontakta $contact_email omedelbart för adresskorrigeringar
- Vi kan inte garantera adressändringar när de väl skickats

## 10. Risköverföring
Risk för förlust och äganderätt för varor övergår till kunden vid leverans till fraktföretaget.

## Kontaktinformation
För frågor om frakt och leverans, kontakta $contact_email.`
            }
        ]
    }
];

async function seedPageTemplates() {
    try {
        console.log('🌱 Seeding page templates...');
        
        // Ensure database is connected
        if (!database.db) {
            await database.initialize();
        }
        
        for (const templateData of pageTemplateData) {
            // Create or find the main template
            let template = await PageTemplate.findByKey(templateData.template_key);
            
            if (!template) {
                template = await PageTemplate.create({
                    template_key: templateData.template_key,
                    template_type: templateData.template_type
                });
                console.log(`✅ Created template: ${templateData.template_key}`);
            } else {
                console.log(`📝 Found existing template: ${templateData.template_key}`);
            }
            
            // Create or update translations
            for (const translationData of templateData.translations) {
                const result = await PageTemplateTranslation.findOrCreate(
                    template.id,
                    translationData.language_code,
                    {
                        title: translationData.title,
                        slug: translationData.slug,
                        content: translationData.content,
                        meta_title: translationData.meta_title,
                        meta_description: translationData.meta_description
                    }
                );
                
                if (result.created) {
                    console.log(`  ✅ Created ${translationData.language_code} translation for ${templateData.template_key}`);
                } else {
                    console.log(`  📝 Updated ${translationData.language_code} translation for ${templateData.template_key}`);
                }
            }
        }
        
        console.log('🎉 Page templates seeded successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding page templates:', error);
        throw error;
    }
}

module.exports = { seedPageTemplates };