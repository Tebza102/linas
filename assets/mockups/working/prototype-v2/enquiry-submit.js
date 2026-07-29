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
  var refNumber = document.getElementById("referenceNumber");
  var submitting = false;

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
      email: form.email.value.trim() || undefined,
      enquiryType: form.occasion.value,
      eventDate: form.date.value || undefined,
      location: form.location.value.trim() || undefined,
      guestCount: form.guests.value || undefined,
      serviceRequirements: form.requirements.value.trim() || undefined,
      message: form.notes.value.trim() || undefined,
      source: form.source.value || "Website",
      popiaConsent: form.consent.checked,
      company: form.company.value // honeypot — real visitors never fill this
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
          status.textContent = "Enquiry received — thank you. Lina will follow up personally.";
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
