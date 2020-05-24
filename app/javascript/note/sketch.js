var points = [];
var polyline = null;
var textBox = null;
var mode = null;
var screen2SVG;
const SVGNS = "http://www.w3.org/2000/svg";

function moveHandler(event) {
  if (event.pressure > 0 && mode === 'draw') {
    points.push(new DOMPoint(event.x, event.y));
    //console.log(points);
    //console.log(event.clientX, event.clientY, event.pointerType, event.pressure);
    if (polyline != null) {
      polyline.setAttributeNS(null, "points", svgPoints(points));
    }  
  }
}

function downHandler(event) {
  console.log(event);
  points = [new DOMPoint(event.x, event.y)];
  var drawing = document.getElementById("drawing");
  // Changes each time the page scrolls
  var m = drawing.getScreenCTM().inverse();
  screen2SVG = new DOMMatrixReadOnly([m.a, m.b, 0, 0, m.c, m.d, 0, 0, 0, 0, 0, 0, m.e, m.f, 0, 0]);

  if (mode === 'draw') {
    polyline = document.createElementNS(SVGNS, "polyline");
    polyline.setAttributeNS(null, "stroke", "gray");
    polyline.setAttributeNS(null, "fill", "transparent");
    polyline.setAttributeNS(null, "stroke-width", "1");
    drawing.append(polyline);
  }
  else if (mode === 'text') {
  }
  else {
    textBox = event.target;
    textBox.focus();
  }
}

function upHandler(event) {
  console.log(event);
  points.push(new DOMPoint(event.x, event.y));
  if (mode === 'draw') {
    if (polyline != null) {
      polyline.setAttributeNS(null, "points", svgPoints(points));
      polyline.setAttributeNS(null, "stroke", "black");
      polyline = null;
    }
  }
  else if (mode === 'text') {
    if (event.target.nodeName === 'text') {
      textBox = event.target;
    } else {

      var drawing = document.getElementById("drawing");
      var textBoundary = points.map(p => screen2SVG.transformPoint(p))
      // Create editor element floating above the drawing
      textBox = document.createElement("trix-editor");
      textBox.classList.add('graphic');
      textBox.classList.add('trix-content');
      textBox.style.left = `${event.x}px`;
      textBox.style.top = `${event.y}px`;
      document.body.append(textBox);
      textBox.addEventListener('blur', event => transferTextToDrawing(event.target, drawing));
      const editor = textBox.editor;
      // Calculate the offset needed to position the first letter at the cursor
      editor.insertString(" ");
      var rect = textBox.editor.getClientRectAtPosition(0)
      var offsety = rect.top + rect.height / 2 - event.y; // Middle of the first character
      var offsetx = rect.left - event.x;
      textBox.style.left = `${event.x - offsetx}px`;
      textBox.style.top = `${event.y - offsety}px`;
      editor.setSelectedRange([0,1]);
      editor.deleteInDirection("forward");
      // Position the toolbar
      const toolbar = textBox.previousSibling;
      toolbar.style.left = textBox.style.left;
      toolbar.style.top = `${event.y - offsety - 32}px`;
    }
    textBox.focus();
  }
}

function keyDownHandler(event) {
  if (mode === 'text') {
    if (textBox != null) {
      if (textBox.virgin) {
        textBox.textContent = "";
        textBox.virgin = false;
      }
      if (event.code.match(/Key|Space|Digit|Minus|Equal|Bracket|Semicolon|Quote|Backquote|Backslash|Comma|Period|Slash/)) {
        textBox.textContent += event.key;
        // Break very long text into <tspan> elements https://stackoverflow.com/questions/16701522/how-to-linebreak-an-svg-text-within-javascript
      }
      else if (event.code.match(/Enter/)) {
        textBox.blur();
        noneHandler();
        textBox = null;
      }
      else if (event.code.match(/Backspace/)) {
        textBox.textContent = textBox.textContent.substring(0, textBox.textContent.length-1);
      }
      else {
        console.log(event);
      }
      event.preventDefault();
    }
  } else {
    if (event.code.match(/Delete/)) {
      if (textBox != null) {
        textBox.remove();
        textBox = null;
      }
    }
  }
}

function keyUpHandler(event) {
  //console.log(event);
}

function svgPoints(domPoints) {
  var ps = domPoints.map(p => screen2SVG.transformPoint(p))
  return ps.map(p => p.x + "," + p.y).join(" ");
}

function svgRect(rect) {
  var origin = screen2SVG.transformPoint(new DOMPoint(rect.x, rect.y));
  var extent = screen2SVG.transformPoint(new DOMPoint(rect.right, rect.bottom));
  return new DOMRect(origin.x, origin.y, extent.x - origin.x, extent.y - origin.y);
}

function transferTextToDrawing(trixEdit, drawing) {
  console.log("transferTextToDrawing", trixEdit.editor.getDocument().getBlocks());
  const editor = trixEdit.editor;
  const firstGlyphRect = editor.getClientRectAtPosition(0);
  const textWidth = contentWidth(trixEdit);
  if (firstGlyphRect) {  // if there is no text, bail out
    var textPosition = screen2SVG.transformPoint(new DOMPoint(firstGlyphRect.x, firstGlyphRect.bottom - 3)); // svg uses baseline vertical position
    textBox = document.createElementNS(SVGNS, "text");
    drawing.append(textBox);
    textBox.setAttributeNS(null, "x", textPosition.x);
    textBox.setAttributeNS(null, "y", textPosition.y);
    textBox.setAttribute("width", textWidth);
    textBox.setAttributeNS(null, "class", "regular");
    textBox.setAttributeNS(null, "tabindex", 1);
    updateText(editor, textBox);
    updateTextFromHTML(trixEdit.querySelector("div"), textBox);
  }  
  trixEdit.previousSibling.remove();
  trixEdit.remove();
}

function updateTextFromHTML(top, text) {
  //console.log("updateTextFromHTML", top);
  
}

function updateText(editor, text) {
  const doc = editor.getDocument();
  console.log("updateText", doc);
  let cursor = 0;
  doc.getBlocks().forEach(function (block) {
    let firstGlyphRect = editor.getClientRectAtPosition(cursor);
    let startPosition = screen2SVG.transformPoint(new DOMPoint(firstGlyphRect.x, firstGlyphRect.bottom - 3));
    renderBlock(block, text, startPosition)
    cursor += block.text.pieceList.endPosition;
  });
}

function renderBlock(block, target, position) {
  console.log("renderBlock", block, target.getAttribute("width"));
  const attributes = block.getAttributes();
  const tspan = document.createElementNS(SVGNS, "tspan");
  tspan.setAttributeNS(null, "x", position.x);
  tspan.setAttributeNS(null, "y", position.y);
  tspan.setAttribute("max-width", target.getAttribute("width"));
  console.log(attributes);
  if (block.hasAttribute('heading1')) {
    tspan.setAttributeNS(null, "class" , "title");
  }
  target.append(tspan);
  let offset = target.parentElement.createSVGPoint();
  block.text.getPieces().forEach(piece => renderPiece(piece, tspan, offset));
}

function renderPiece(piece, target, offset) {
  const width = parseInt(target.getAttribute("max-width"));
  const left = parseInt(target.getAttribute("x"));
  const attributes = piece.getAttributes();
  console.log("renderPiece", piece, width);

  if (attributes.blockBreak) {
    offset.x = 0;
    return;
  }

  let text = piece.string;
  while (text.length > 0) {
    if (text[0] === "\n") {
      offset.x = 0;
      offset.y += 19.5;
      text = text.substring(1);
    }
    else {
      let endLine = text.indexOf("\n");
      let line = "";
      if (endLine > 0) {
        line = text.substring(0, endLine);
        text = text.substring(endLine);
      }
      else {
        line = text;
        text = "";
      }
      renderLine(line, target, attributes, left, offset, width);
      if (text[0] === "\n")
        offset.y = 0;
    }
  }
}

function renderLine(line, target, attributes, left, offset, width) {
  do {
    const tspan = document.createElementNS(SVGNS, "tspan");
    tspan.setAttributeNS(null, "x", left + offset.x);
    tspan.setAttributeNS(null, "dy", offset.y);
    if (attributes.italic)
      tspan.classList.add('italic');
    if (attributes.bold)
      tspan.classList.add('bold');
    if (attributes.strike)
      tspan.classList.add('strike');
    tspan.textContent = line;
    target.append(tspan);
    let length = computeTextLength(tspan, width); // width - offset.x
    if (length < line.length) {
      let sub = line.substring(0, length);
      if (line[length] == ' ') {
        line = line.substring(length + 1);
      }
      else {
        let lastSpace = sub.lastIndexOf(' ');
        if (lastSpace > 0) {
          line = line.substring(lastSpace + 1)
          sub = sub.substring(0, lastSpace)
        }
        else {
          line = line.substring(length);
        }
      }
        
      tspan.textContent = sub;
      offset.x = 0;
      offset.y = 19.5;
    } else {
      line = "";
      offset.x += tspan.getComputedTextLength();
      offset.y = 0;
    }
  } while (line.length > 0)
}


// Compute the length of the text content necessary to fit within maxWidth
function computeTextLength(tspan, maxWidth) {
  let text = tspan.textContent;
  if (text.length == 0)
    return 0;
  let width = tspan.getComputedTextLength();
  let ratio = maxWidth / width;
  if (ratio >= 1)
    return text.length;
  let length = Math.round(ratio * text.length);

  width = tspan.getSubStringLength(0, length);
  if (width > maxWidth) {
    do {
      length -= 1;
      width = tspan.getSubStringLength(0, length);
    } while (length > 1 &&  width > maxWidth);
  }
  else if (width < maxWidth) {
    while (length < text.length && (width = tspan.getSubStringLength(0, length + 1)) < maxWidth) {
      length += 1;
    } 
  }

  return length;
}

function contentWidth(element) {
  let style = window.getComputedStyle(element);
  let padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  return element.scrollWidth - padding;
}

function saveContent(event) {
//  console.log(event);
  var source = document.getElementById("drawing");
  var target  = document.getElementById("note_content");
  target.setAttribute('value', source.innerHTML)
}

function pointerEvents(event) {
  // console.debug(event.type, event.data, "pointerEvents");
  var drawing = document.getElementById("drawing");
  var m = drawing.getScreenCTM().inverse();
  screen2SVG = new DOMMatrixReadOnly([m.a, m.b, 0, 0, m.c, m.d, 0, 0, 0, 0, 0, 0, m.e, m.f, 0, 0]);
  drawing.onpointermove = moveHandler;
  drawing.onpointerdown = downHandler;
  drawing.onpointerup = upHandler;
  var form = document.forms[0];
  form.addEventListener("submit", saveContent);
}

function keyboardEvents(event) {
  // console.debug(event.type, event.data, "keyboardEvents")
  var drawing = document.getElementById("drawing");
  drawing.onkeydown = keyDownHandler;
  drawing.onkeyup = keyUpHandler;
}

function textHandler(event) {
  var drawing = document.getElementById("drawing");
  mode = 'text';
  drawing.classList.add('text');
  drawing.classList.remove('draw');
  event.preventDefault();
}

function drawHandler(event) {
  var drawing = document.getElementById("drawing");
  mode = 'draw';
  drawing.classList.add('draw');
  drawing.classList.remove('text');
  event.preventDefault();
}

function noneHandler(event) {
  var drawing = document.getElementById("drawing");
  mode = null;
  drawing.classList.remove('draw');
  drawing.classList.remove('text');
  if (event != null)
    event.preventDefault();
}

function toolbarEvents(event) {
  document.getElementById('none_command').onclick = noneHandler;
  document.getElementById('text_command').onclick = textHandler;
  document.getElementById('draw_command').onclick = drawHandler;
}

export function initialize(event) {
  console.log("sketch.initialize", document.title, event ? event.type : "no event");
  if (document.getElementById("toolbar"))
    toolbarEvents();
  if (document.getElementById("drawing")) {
    keyboardEvents();
    pointerEvents();
  }
}

