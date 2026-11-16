# Writing a tour

A map is a picture. A tour is the argument. It is the artefact a newcomer actually
reads, so it deserves more care than the map around it.

## What a tour is

A tour is an ordered list of stops. Each stop points at a waypoint and carries a
short piece of narration written for that position in the walk — what to notice
here, why it matters, what it connects to next.

The narration is the tour. The waypoint's description is shown underneath it, as
the detail it is; nobody has to open the inspector to read a tour.

## Building one

1. **New tour** in the dock, then give it a name that says what the walk promises:
   _A newcomer walks the product_, _Where this can hurt us_.
2. **Edit tour** opens the stop list. Add waypoints as stops, drag them into the
   order you want to say things in.
3. Write the narration for each stop. Two or three sentences is a good stop; one
   is fine if the sentence is the point.

## What the reader sees

The reading surface opens by itself when a tour is selected:

- A card in the map's bottom-left corner shows `Stop 3 of 7`, the waypoint's type
  and label, the narration in full, and the description under **About this
  waypoint**.
- The card moves to another corner when the focused stop would fall underneath it.
  Nothing pans or zooms the map to make room, so the map you arranged is the map
  the reader sees.
- `←` and `→` step the walk while a tour is selected, and the selection follows
  the stop, exactly as the dock's buttons do. With no tour selected the arrows
  keep their usual meaning.
- Closing the card holds for the rest of that tour on that map — switching maps or
  tours brings it back. **Show the tour text** in the toolbar restores it without
  changing the stop.
- **Whole tour** turns the same surface into a full-height panel listing every
  stop's narration at once, and closes back to the card at the stop being read.

Two states are stated rather than left blank:

| Situation                         | What the surface says                                       |
| --------------------------------- | ----------------------------------------------------------- |
| A stop with no narration          | `This stop has no narration yet.`                           |
| A tour whose stops are all silent | `This tour has no narration yet.`                           |
| A tour with no stops              | `This tour has no stops yet.` + `Add stops with Edit tour.` |

## Writing narration worth reading

- **Start with what the reader is looking at.** The stop is visible on the canvas;
  name it, then say the thing it does not show.
- **One idea per stop.** If a stop needs "and also", it is two stops.
- **Say what would break.** A newcomer can read a signature. They cannot read why
  the queue is sorted this way, or what happens when it is not.
- **Write for the third reader.** The first is you; the second is the next hire;
  the third is an agent that will be told to change this code in a month.
- **Do not narrate the interface.** "As you can see in the inspector" ages badly.

## Exporting a tour

**Export** in the dock writes the current tour as Markdown — the stops in order,
the narration, and the waypoints they point at — and downloads it as
`<tour-name>.md`. That is the form to paste into a wiki, a pull request
description, or a design review: a tour that can leave the tool is a tour someone
will actually read.

To move a whole map rather than a tour, see
[Moving maps between projects](moving-maps.md).
