# Canvasite

This project is based on the [make-real-starter](https://github.com/tldraw/make-real-starter) template of [makereal.tldraw.com](https://makereal.tldraw.com). To get started:

1. Use the template and clone your new repo to your computer
2. Run `npm install` to install dependencies
3. Get an OpenAI API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
4. Create a `.env.local` file that contains `OPENAI_API_KEY=your api key here`
5. Run `npm run dev`
6. Open [localhost:3000](http://localhost:3000) and make some stuff real!

## How it works

Make Real is built with [tldraw](https://tldraw.dev), a very good React library for creating whiteboards and other infinite canvas experiences.

To use it, first draw a mockup for a piece of UI. When
you're ready, select the drawing, and press the Make Real button.
We'll capture an image of your selection, and send it to
[OpenAI's GPT-4o-mini](https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/) along with
instructions to turn it into a HTML file.

We take the HTML response and add it to a tldraw
[custom shape](https://tldraw.dev/docs/shapes#Custom-shapes). The custom shape
shows the response in an iframe so that you can interact with it on the canvas. If you
want to iterate on the response, annotate the iframe, select it all, and press 'Make Real' again.

## Changes made

- Updated from GPT-4V to GPT-4o-mini
- Resolved various missing/misplaced modules ('not found')
- Revised package.json to accomodate deployment on Replit