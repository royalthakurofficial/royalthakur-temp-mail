<?php
namespace App\Controllers;

use App\Config;

class HomeController
{
    public function index(): void
    {
        $base = Config::baseUrl();
        $csrf = \csrf_token();
        echo <<<HTML
<!doctype html>
<html lang="en" class="h-full">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Royal Temp Mail</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="h-full bg-gray-950 text-gray-100">
  <div class="max-w-6xl mx-auto p-6">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Royal Temp Mail</h1>
      <nav class="space-x-4">
        <a class="hover:underline" href="{$base}/login">Login</a>
        <a class="hover:underline" href="{$base}/register">Register</a>
      </nav>
    </header>

    <section class="mt-10 grid lg:grid-cols-2 gap-8 items-start">
      <div>
        <h2 class="text-xl font-semibold mb-4">Instant Disposable Email</h2>
        <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <label class="block text-sm text-gray-400">Your temp address</label>
          <div class="mt-2 flex items-center">
            <input id="addr" class="flex-1 bg-gray-950 border border-gray-800 rounded-l px-3 py-2" readonly value="" />
            <button id="copyBtn" class="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-r">Copy</button>
          </div>
          <div class="mt-3 text-sm text-gray-400">Use this address to receive emails instantly.</div>
          <div class="mt-3">
            <button id="newBtn" class="bg-gray-800 border border-gray-700 px-3 py-2 rounded">New Address</button>
          </div>
        </div>

        <div class="mt-6 bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 class="font-medium">Inbox</h3>
          <div id="inbox" class="mt-3 space-y-2 max-h-96 overflow-auto"></div>
        </div>
      </div>
      <div>
        <h2 class="text-xl font-semibold mb-4">Plans</h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <h3 class="font-semibold">Free</h3>
            <ul class="mt-2 text-sm text-gray-300 list-disc list-inside">
              <li>100 API calls/day</li>
              <li>5 emails/day</li>
              <li>24-hour storage</li>
              <li>1 active address</li>
            </ul>
          </div>
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <h3 class="font-semibold">Premium ₹299/mo</h3>
            <ul class="mt-2 text-sm text-gray-300 list-disc list-inside">
              <li>10,000 API calls/day</li>
              <li>100 emails/day</li>
              <li>30-day storage</li>
              <li>Multiple addresses</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>

  <script>
    const csrf = {$csrf ? '"' . $csrf . '"' : 'null'};
    const addrInput = document.getElementById('addr');
    const inbox = document.getElementById('inbox');
    const copyBtn = document.getElementById('copyBtn');
    const newBtn = document.getElementById('newBtn');

    async function requestNewAddress() {
      const res = await fetch('{$base}/api/addresses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf })
      });
      const data = await res.json();
      if (data.address) {
        addrInput.value = data.address;
        subscribe(data.address);
      }
    }

    function subscribe(address) {
      const url = new URL('{$base}/api/emails/stream', window.location.href);
      url.searchParams.set('address', address);
      const es = new EventSource(url.toString());
      es.onmessage = (ev) => {
        const payload = JSON.parse(ev.data);
        const item = document.createElement('div');
        item.className = 'p-3 rounded border border-gray-800 bg-gray-950';
        item.innerHTML = `<div class="text-sm text-gray-400">From: ${payload.from} — ${payload.subject}</div>`;
        inbox.prepend(item);
      };
      es.onerror = () => es.close();
    }

    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(addrInput.value);
      copyBtn.textContent = 'Copied';
      setTimeout(() => copyBtn.textContent = 'Copy', 1200);
    };

    newBtn.onclick = () => requestNewAddress();

    requestNewAddress();
  </script>
</body>
</html>
HTML;
    }
}
