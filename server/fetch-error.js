async function main() {
  try {
    const res = await fetch("https://educatechportal.com/api/public-school/albayyinah-school");
    console.log("Status:", res.status);
    const body = await res.text();
    console.log("Response Body:", body);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
main();
