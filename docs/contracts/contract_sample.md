```

<?xml version="1.0" encoding="utf-8"?>
<c-analysis>
  <header info="???" name="???" time="???" />
  <cfile name="???">
    <data-structures />
    <global-variables>
      <gvar const="???" lb="1234" name="???" static="???" ub="1234" value="1234" />
    </global-variables>
    <functions>
      <function name="???">
        <parameters>
          <par name="???" nr="1234" />
        </parameters>
        <postconditions>
          <post>
            <math>
              <apply>
                <tainted />
                <preserves-all-memory />
                <lt />
                <eq />
                <return />
                <ci>???</ci>
                <cn>1234</cn>
              </apply>
            </math>
          </post>
        </postconditions>
      </function>
    </functions>
  </cfile>
</c-analysis>

```