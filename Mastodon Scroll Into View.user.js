// ==UserScript==
// @name         Mastodon Scroll Into View
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script brings the first toot you haven't read into view when clicking on the "X new items" button.
// @author       You
// @match        https://universeodon.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @run-at       document-idle
// @grant        none
// ==/UserScript==

//
// You will need to edit @match to work with your specific instance of Mastodon, or otherwise override it in
// whatever plugin you use to run userscripts.
//
// This userscript works with the web interface of Mastodon. Your interface needs to have "Slow mode" turned on
// in the settings.
//
// What it does is pretty simple: all versions of the web interface I've used are buggy. When you click on the 
// "X new tiems" at the top of the Home column, it tries to scroll into an intelligent position but often fails.
// This fixes that. After your click the column will scroll so that the first toot at the top is new, and it will
// be focussed. 
//

(async function () {
    'use strict';

    const debug = false;
    const appName = "Mastodon Scroll Into View";
    function showLog(...args) {
        if (debug === true) {
            console.log(appName, ...args);
        }
    }

    showLog("initializing...");

    async function waitForHome() {
        return new Promise((resolve) => {
            const home = document.querySelector(`[role='region'][aria-label='Home']`);
            if (home !== null) {
                resolve(home);
                return;
            }
            setTimeout(() => resolve(waitForHome()), 0.1);
        });
    }

    const buttonClass = ".load-more.load-gap";
    const buttonSelector = `button${buttonClass}`;
    const home = await waitForHome();
    showLog("acquired home");
    const scrollable = home.querySelector("div.scrollable");
    const scrollableRect = scrollable.getBoundingClientRect();

    function installHandler(component) {
        showLog("installing on", component);
        let firstArticle = null;
        component.addEventListener("mousedown", () => {
            const articles = scrollable.querySelectorAll("article");
            for (const article of articles) {
                const articleRect = article.getBoundingClientRect();
                showLog("articleRect.top", articleRect.top, "scrollableRect.top", scrollableRect.top);
                if (articleRect.top > scrollableRect.top) {
                    firstArticle = article;
                    break;
                }
            }
        });
        component.addEventListener("mouseup", () => {
            if (firstArticle !== null) {
                showLog("scrolling into view");
                setTimeout(() => {
                    const prev = firstArticle.previousElementSibling;
                    prev.scrollIntoView();
                    prev.querySelector("div.status__wrapper").focus();
                }, 0);
            }
        });
    }

    function installHandlerOnSubtree(element) {
        for (const button of element.querySelectorAll(buttonSelector)) {
            installHandler(button);
        }
    }


    installHandlerOnSubtree(home);

    const observer = new MutationObserver((changes) => {
        for (const change of changes) {
            for (const addedNode of change.addedNodes) {
                if (addedNode.nodeType === Node.ELEMENT_NODE) {
                    installHandlerOnSubtree(addedNode);
                    if (addedNode.matches(buttonSelector)) {
                        installHandler(addedNode);
                    }
                }
            }
        }

    });

    observer.observe(scrollable, { childList: true, subtree: true });

    let counter = 0;
    scrollable.addEventListener("scroll", (ev) => {
        counter++;
        showLog("scroll", counter, ev.target, ev.target.scrollTop, ev.target.scrollLeft);
    });
})();