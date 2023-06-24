// ==UserScript==
// @name         DRTV Eng Sub
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add English subtitles below the Danish ones
// @author       Gienio
// @match        https://www.dr.dk/drtv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dr.dk
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /* TODO:
        - fix linebreak translation loss
        - implement hover
        - possibly implement in-page settings
    */

    // USER CONFIGURATION
        const TARGET_LANGUAGE = "en";

        // uncomment the first API_URL if you selfhost, the second one if you want to use a public instance
        const API_URL = "http://127.0.0.1:5000/translate";
        //const API_URL = "https://translate.foxhaven.cyou/translate";

    // wait for the subtitle button to render
    wait_for_element('.drtv-player-button__subtitle').then((subtitle_button) => {
        //let subtitle_button = document.querySelector(".drtv-player-button__subtitle")
        let observer;
        // listen to button clicks
        const setAttribute = subtitle_button.setAttribute;
            subtitle_button.setAttribute = (key, value) => {
               // if the subtitle button is pressed
               if (key == "aria-pressed") {
                   //logger("turned", value, "subtitles");
                   if (value == "true") {
                       observer = detect_subtitle();
                   } else {
                       if (observer) {
                           observer.disconnect();
                       }
                   };
               }
               setAttribute.call(subtitle_button, key, value);
           };
    });

    function detect_subtitle() {
        // listen to changes in the parent div
        let observer = new MutationObserver(function(mutationsList) {
            let subtitle_parent_div = mutationsList[0].target;
            let subtitle_div = subtitle_parent_div.querySelector(".vjs-text-track-cue");
            if (subtitle_div) {
                // retrieve the Danish text
                let subtitle_text = subtitle_div.querySelector("div").innerHTML;
                //logger("new subtitle:" + subtitle_text);
                translate(subtitle_text).then((translated_subtitle_text) => {
                    let translated_subtitle_html =
                        `<div style="color: rgb(155, 155, 155); background-color: rgba(0, 0, 0, 0.8); position: relative; inset: 0px; display: inline; writing-mode: horizontal-tb; unicode-bidi: plaintext; font-size: 75%;">
                    ${translated_subtitle_text}
                    </div>`
                    // inject our subtitle into the website
                    subtitle_div.innerHTML += translated_subtitle_html;
                });
            } else {
                //logger("subtitle removed");
            }
        });

        observer.observe(document.querySelector(".vjs-text-track-display"), {characterData: false, childList: true, attributes: false});
        return observer;
    }

    async function translate(subtitle) {
        // make an API call to LibreTranslate
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                q: subtitle,
                source: "da",
                target: TARGET_LANGUAGE,
                format: "text",
                api_key: ""
            }),
            headers: { "Content-Type": "application/json" }
        });

        let translated_subtitle = (await res.json()).translatedText
        //logger("translation:" + translated_subtitle)
        return translated_subtitle
    }

    function logger(log) {
        console.log("DRTV Eng Sub Extension:\n", log)
    }

    // wait until an element renders and then do something
    function wait_for_element(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
})();