// Lina's — real enquiry submission for contact.html. Posts to the
// validated serverless endpoint (api/enquiries/create.js), which is the
// only thing allowed to write to Firestore's enquiries collection — see
// firestore.rules for why direct client writes are not used here.
(function () {
  "use strict";
  var form = document.getElementById("enquiryForm");
  if (!form) return;

  var status = document.getElementById("formStatus");
  var submitBtn = document.getElementById("enquirySubmitBtn");
  var refBox = document.getElementById("referenceBox");
  var refLede = document.getElementById("referenceBoxLede");
  var refNumber = document.getElementById("referenceNumber");
  var whatsappBtn = document.getElementById("whatsappSaveBtn");
  var submitting = false;

  // Generated once per form load/session, kept only in memory (never
  // localStorage) — its only purpose is letting the server recognise a
  // repeated click of THIS SAME submission as the same one, without
  // treating every enquiry from this phone number as a duplicate.
  var submissionId = (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : "sid-" + Date.now() + "-" + Math.random().toString(36).slice(2);

  if (whatsappBtn) {
    whatsappBtn.addEventListener("click", function () {
      var ref = refNumber.textContent;
      var message = "My Lina's enquiry reference is " + ref + ". This confirms receipt only, not a booking.";
      // No destination number: opens WhatsApp's own contact picker so the
      // customer chooses who (if anyone) to send it to, including
      // themselves — Lina's WhatsApp number isn't confirmed yet (see
      // Client Inputs Register I-006/I-014), so this deliberately never
      // targets a business number.
      window.open("https://wa.me/?text=" + encodeURIComponent(message), "_blank", "noopener");
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return; // duplicate-click protection
    if (!form.checkValidity()) {
      status.textContent = "Please fill in every required field, including consent, before sending.";
      status.setAttribute("data-state", "error");
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    status.textContent = "Sending...";
    status.removeAttribute("data-state");
    refBox.hidden = true;

    var payload = {
      customerName: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      enquiryType: form.occasion.value,
      eventDate: form.date.value || undefined,
      location: form.location.value.trim() || undefined,
      guestCount: form.guests.value || undefined,
      serviceRequirements: form.requirements.value.trim() || undefined,
      message: form.notes.value.trim() || undefined,
      source: form.source.value || "Website",
      popiaConsent: form.consent.checked,
      company: form.company.value, // honeypot — real visitors never fill this
      submissionId: submissionId
    };

    fetch("/api/enquiries/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        submitting = false;
        submitBtn.disabled = false;
        if (result.ok && result.data.ok) {
          if (result.data.duplicateDetected) {
            status.textContent = "You already sent this enquiry — here's your existing reference.";
            refLede.textContent = "Your existing enquiry reference:";
          } else {
            status.textContent = "Enquiry received — thank you. Lina will follow up personally.";
            refLede.textContent = "Your enquiry has been received. Enquiry reference:";
          }
          status.setAttribute("data-state", "success");
          refNumber.textContent = result.data.enquiry.referenceNumber;
          refBox.hidden = false;
          form.reset();
        } else {
          status.textContent = "Could not send your enquiry: " + (result.data.error || "please check the form and try again.");
          status.setAttribute("data-state", "error");
        }
      })
      .catch(function () {
        submitting = false;
        submitBtn.disabled = false;
        status.textContent = "Could not reach the server — your enquiry was not sent. Please try again, or contact Lina's directly.";
        status.setAttribute("data-state", "error");
      });
  });
})();
