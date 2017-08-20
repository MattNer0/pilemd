function dragOverPercentage(element, clientY) {
  var rect = element.getBoundingClientRect();
  return (clientY - rect.top) / (rect.bottom - rect.top);
}

module.exports = {
  dragOverPercentage: dragOverPercentage
};
