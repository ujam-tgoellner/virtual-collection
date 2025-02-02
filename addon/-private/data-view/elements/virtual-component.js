import { set } from '@ember/object';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { IS_GLIMMER_2, gte as emberVersionGTE } from 'ember-compatibility-helpers';

import document from '../../utils/document-shim';

let VC_IDENTITY = 0;

export default class VirtualComponent {
  constructor(content = null, index = null, orientation = 'vertical') {
    this.id = `VC-${VC_IDENTITY++}`;

    this.content = content;
    this.index = index;
    this.orientation = orientation;

    // We check to see if the document exists in Fastboot. Since RAF won't run in
    // Fastboot, we'll never have to use these text nodes for measurements, so they
    // can be empty
    this.upperBound = document !== undefined ? document.createTextNode('') : null;
    this.lowerBound = document !== undefined ? document.createTextNode('') : null;

    this.rendered = false;

    if (!emberVersionGTE('3.0.0')) {
      // In older versions of Ember, binding anything on an object in the template
      // adds observers which creates __ember_meta__
      this.__ember_meta__ = null; // eslint-disable-line camelcase
    }

    if (DEBUG) {
      Object.preventExtensions(this);
    }
  }

  get realUpperBound() {
    return IS_GLIMMER_2 ? this.upperBound : this.upperBound.previousSibling;
  }

  get realLowerBound() {
    return IS_GLIMMER_2 ? this.lowerBound : this.lowerBound.nextSibling;
  }

  getBoundingClientRect() {
    let { upperBound, lowerBound } = this;

    let top = Infinity;
    let bottom = -Infinity;
    let left = Infinity;
    let right = -Infinity;

    while (upperBound !== lowerBound) {
      upperBound = upperBound.nextSibling;

      if (upperBound instanceof Element) {
        top = Math.min(top, upperBound.getBoundingClientRect().top);
        bottom = Math.max(bottom, upperBound.getBoundingClientRect().bottom);
        left = Math.min(left, upperBound.getBoundingClientRect().left);
        right = Math.max(right, upperBound.getBoundingClientRect().right);
      }

      if (DEBUG) {
        if (upperBound instanceof Element) {
          continue;
        }

        const text = upperBound.textContent;

        assert(`All content inside of ${this.orientation}-collection must be wrapped in an element. Detected a text node with content: ${text}`, text === '' || text.match(/^\s+$/));
      }
    }

    if( this.orientation === 'horizontal' )
    {
      assert(`Items in a ${this.orientation} collection require atleast one element in them`, left !== Infinity && right !== -Infinity);
    }
    else
    {
      assert(`Items in a ${this.orientation} collection require atleast one element in them`, top !== Infinity && bottom !== -Infinity);
    }

    const height = bottom - top;
    const width = right - left;

    return { top, bottom, height, left, right, width };
  }

  recycle(newContent, newIndex) {
    assert(`You cannot set an item's content to undefined`, newContent);

    if (this.index !== newIndex) {
      set(this, 'index', newIndex);
    }

    if (this.content !== newContent) {
      set(this, 'content', newContent);
    }
  }

  destroy() {
    set(this, 'upperBound', null);
    set(this, 'lowerBound', null);
    set(this, 'content', null);
    set(this, 'index', null);
  }
}
