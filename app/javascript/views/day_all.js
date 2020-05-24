function(doc) {
  if(doc.ruby_class && doc.ruby_class == 'Day') {
    emit(doc['on'], 1);
  }
}

