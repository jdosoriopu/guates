import webpush from "web-push";

const [command] = process.argv.slice(2);

if (command === "vapid-keys") {
  const keys = webpush.generateVAPIDKeys();
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
} else {
  console.error("Uso: node cli.js vapid-keys");
  process.exit(1);
}
