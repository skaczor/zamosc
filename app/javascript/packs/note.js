import {initialize as sketchInit} from '../note/sketch'

if (!document.isListeningToSketchEvents) {
  document.isListeningToSketchEvents = true;
  sketchInit();
  document.addEventListener('turbolinks:load', sketchInit);
}
